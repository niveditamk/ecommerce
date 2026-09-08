/* Import the Aurelis catalogue into Medusa.
 *
 * Reads data/aurelis-catalogue.json, which scripts/export-catalogue.mjs
 * produces from the SQLite database. Kept as two steps on purpose so no
 * `node:sqlite` handle is ever open inside the Medusa process.
 *
 * Idempotent by handle: re-running skips products already present rather
 * than creating duplicates, so this is safe to run repeatedly while the
 * mapping is still being tuned.
 *
 *   npx medusa exec ./src/scripts/import-aurelis.ts
 */
import { ExecArgs, CreateInventoryLevelInput } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows";
import fs from "node:fs";
import path from "node:path";

type Catalogue = {
  categories: { slug: string; name: string; description: string }[];
  products: {
    handle: string;
    title: string;
    category: string;
    price: number;
    compareAt: number | null;
    description: string;
    material: string;
    sizes: string[];
    colours: string[];
    stock: number;
    image: string;
  }[];
};

export default async function importAurelis({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const salesChannelService = container.resolve(Modules.SALES_CHANNEL);
  const fulfillmentService = container.resolve(Modules.FULFILLMENT);
  const productService = container.resolve(Modules.PRODUCT);

  const file = path.join(process.cwd(), "data", "aurelis-catalogue.json");
  if (!fs.existsSync(file)) {
    logger.error(`No catalogue at ${file} — run: node scripts/export-catalogue.mjs`);
    return;
  }
  const cat: Catalogue = JSON.parse(fs.readFileSync(file, "utf8"));
  logger.info(`Read ${cat.products.length} products, ${cat.categories.length} categories.`);

  /* ---- sales channel ---- */
  let [channel] = await salesChannelService.listSalesChannels({ name: "Aurelis Maison" });
  if (!channel) {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: { salesChannelsData: [{ name: "Aurelis Maison" }] },
    });
    channel = result[0];
    logger.info("Created sales channel.");
  }

  /* ---- region: India, INR ---- */
  const { data: existingRegions } = await query.graph({
    entity: "region", fields: ["id", "name"],
  });
  let region = existingRegions.find((r: any) => r.name === "India");
  if (!region) {
    const { result } = await createRegionsWorkflow(container).run({
      input: {
        regions: [{
          name: "India",
          currency_code: "inr",
          countries: ["in"],
          payment_providers: ["pp_system_default"],
        }],
      },
    });
    region = result[0];
    logger.info("Created India region (INR).");
  }

  /* ---- shipping profile ---- */
  let [profile] = await fulfillmentService.listShippingProfiles({ type: "default" });
  if (!profile) {
    const { result } = await createShippingProfilesWorkflow(container).run({
      input: { data: [{ name: "Default", type: "default" }] },
    });
    profile = result[0];
  }

  /* ---- stock location ---- */
  const { data: locations } = await query.graph({
    entity: "stock_location", fields: ["id", "name"],
  });
  let location = locations.find((l: any) => l.name === "Geneva Atelier");
  if (!location) {
    const { result } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [{
          name: "Geneva Atelier",
          address: { city: "Geneva", country_code: "CH", address_1: "Rue du Rhône" },
        }],
      },
    });
    location = result[0];
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: { id: location.id, add: [channel.id] },
    });
    logger.info("Created stock location and linked the sales channel.");
  }

  /* ---- categories ---- */
  const { data: existingCats } = await query.graph({
    entity: "product_category", fields: ["id", "name"],
  });
  const missingCats = cat.categories.filter(
    (c) => !existingCats.some((e: any) => e.name === c.name)
  );
  if (missingCats.length) {
    await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: missingCats.map((c) => ({
          name: c.name, description: c.description || "", is_active: true,
        })),
      },
    });
    logger.info(`Created ${missingCats.length} categories.`);
  }
  const { data: allCats } = await query.graph({
    entity: "product_category", fields: ["id", "name"],
  });
  const catId = (slug: string) => {
    const source = cat.categories.find((c) => c.slug === slug);
    const found = allCats.find((c: any) => c.name === source?.name);
    return found ? [found.id] : [];
  };

  /* ---- products ----
     Only what is genuinely absent, so a re-run is safe. */
  const existing = await productService.listProducts(
    { handle: cat.products.map((p) => p.handle) },
    { select: ["handle"] }
  );
  const have = new Set(existing.map((p: any) => p.handle));
  const todo = cat.products.filter((p) => !have.has(p.handle));

  if (!todo.length) {
    logger.info("Every product is already present — nothing to create.");
  } else {
    const products = todo.map((p) => {
      /* Our sizes and colours are stored as flat arrays. A piece with
         neither still needs one variant, because Medusa sells variants,
         not products. */
      const sizes = p.sizes?.length ? p.sizes : ["One size"];
      const colours = p.colours?.length ? p.colours : ["As shown"];

      const options = [
        { title: "Size", values: sizes },
        { title: "Finish", values: colours },
      ];

      const variants = sizes.flatMap((size) =>
        colours.map((colour) => ({
          title: `${size} / ${colour}`,
          sku: `${p.handle.toUpperCase()}-${size}-${colour}`
            .replace(/[^A-Z0-9-]/gi, "-").slice(0, 60),
          options: { Size: size, Finish: colour },
          /* Rupees, not paise: our prices are already whole INR. */
          prices: [{ amount: p.price, currency_code: "inr" }],
        }))
      );

      return {
        title: p.title,
        handle: p.handle,
        description: p.description || "",
        category_ids: catId(p.category),
        status: ProductStatus.PUBLISHED,
        shipping_profile_id: profile.id,
        sales_channels: [{ id: channel.id }],
        /* Served by the Aurelis app, so a relative path resolves against
           whichever host the storefront is on. */
        images: [{ url: `http://localhost:4000${p.image}` }],
        options,
        variants,
        metadata: { aurelis_sku: p.handle, material: p.material || "" },
      };
    });

    await createProductsWorkflow(container).run({ input: { products } });
    logger.info(`Created ${products.length} products with ${products.reduce((n, p) => n + p.variants.length, 0)} variants.`);
  }

  /* ---- inventory levels ----
     Our stock is per SKU, not per variant. Splitting it evenly across a
     product's variants would invent numbers we do not have, so the whole
     figure goes to the first variant and the rest start at zero. That is
     visibly wrong in the right way — an operator can see it needs a real
     count — rather than quietly plausible. */
  const { data: items } = await query.graph({
    entity: "inventory_item", fields: ["id", "sku"],
  });
  const { data: levels } = await query.graph({
    entity: "inventory_level", fields: ["id", "inventory_item_id"],
  });
  const levelled = new Set(levels.map((l: any) => l.inventory_item_id));

  const stockFor = new Map(cat.products.map((p) => [p.handle.toUpperCase(), p.stock]));
  const firstSeen = new Set<string>();

  const toCreate: CreateInventoryLevelInput[] = [];
  for (const item of items) {
    if (levelled.has(item.id)) continue;
    const handle = String(item.sku || "").split("-").slice(0, 2).join("-");
    let qty = 0;
    if (stockFor.has(handle) && !firstSeen.has(handle)) {
      qty = stockFor.get(handle)!;
      firstSeen.add(handle);
    }
    toCreate.push({
      location_id: location.id,
      inventory_item_id: item.id,
      stocked_quantity: qty,
    });
  }

  if (toCreate.length) {
    await createInventoryLevelsWorkflow(container).run({
      input: { inventory_levels: toCreate },
    });
    const total = toCreate.reduce((n, l) => n + (l.stocked_quantity || 0), 0);
    logger.info(`Created ${toCreate.length} inventory levels holding ${total} units.`);
  }

  logger.info("Aurelis catalogue import complete.");
}
