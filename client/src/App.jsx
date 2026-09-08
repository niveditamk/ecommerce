/* =============================================================
   AURELIS - ROUTE MAP
   Twenty-five screens, one shell.
   ============================================================= */
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';

import Home from './pages/Home';
import Categories from './pages/Categories';
import Category from './pages/Category';
import Product from './pages/Product';
import Search from './pages/Search';
import Auth from './pages/Auth';
import Cart from './pages/Cart';
import Wishlist from './pages/Wishlist';
import Membership from './pages/Membership';

import CheckoutIdentify from './pages/checkout/Identify';
import CheckoutShipping from './pages/checkout/Shipping';
import CheckoutPayment from './pages/checkout/Payment';
import CheckoutReview from './pages/checkout/Review';
import OrderConfirmation from './pages/checkout/Confirmation';

import Orders from './pages/account/Orders';
import OrderDetail from './pages/account/OrderDetail';
import Profile from './pages/account/Profile';
import PaymentSettings from './pages/account/PaymentSettings';
import Addresses from './pages/account/Addresses';

import Signup from './pages/Signup';
import Returns from './pages/Returns';
import ShippingInfo from './pages/ShippingInfo';
import Help from './pages/Help';
import Stores from './pages/Stores';
import StoreDetail from './pages/StoreDetail';
import Legal from './pages/Legal';
import NotFound from './pages/NotFound';

/* ---- admin ---- */
import { AdminProvider } from './context/AdminContext';
import { AdminFilterProvider } from './context/AdminFilterContext';
import AdminLayout from './components/admin/AdminLayout';
import AdminLogin from './pages/admin/Login';
import CommandCenter from './pages/admin/CommandCenter';
import AIIntelligence from './pages/admin/AIIntelligence';
import InventoryHub from './pages/admin/InventoryHub';
import WarehousesHub from './pages/admin/WarehousesHub';
import ProcurementHub from './pages/admin/ProcurementHub';
import AnalyticsHub from './pages/admin/AnalyticsHub';
import ReportsCenter from './pages/admin/ReportsCenter';
import ProductEditor from './pages/admin/ProductEditor';
import AdminOrderDetail from './pages/admin/OrderDetail';
import AdminMedusa from './pages/admin/Medusa';
import {
  AdminProducts, AdminCategories, AdminOrders, AdminCustomers,
  AdminStaff, AdminRoles, AdminAudit
} from './pages/admin/modules';
import {
  MlLayout, MlDashboard, MlModels, MlModelDetail, MlForecast, MlRecommendations, MlData
} from './pages/admin/ml';

/* An unmatched admin URL should say so inside the admin, keeping the
   sidebar and the operator's session in view. */
function AdminNotFound() {
  return (
    <>
      <header className="admin__head">
        <div>
          <span className="field__label">Not found</span>
          <h1 className="h2">No such page</h1>
          <p className="tiny" style={{ textTransform: 'none', letterSpacing: '.02em', marginTop: 4 }}>
            That address does not match anything in the admin. Use the navigation on the left.
          </p>
        </div>
      </header>
      <div className="notice">
        If you followed a link from inside the admin to get here, that link is wrong — worth reporting.
      </div>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Admin lives outside the storefront shell — its own chrome,
          its own session, and a role-filtered sidebar. */}
      <Route
        path="/admin/login"
        element={<AdminProvider><AdminLogin /></AdminProvider>}
      />
      <Route
        path="/admin"
        element={<AdminProvider><AdminFilterProvider><AdminLayout /></AdminFilterProvider></AdminProvider>}
      >
        <Route index element={<CommandCenter />} />
        <Route path="ai" element={<AIIntelligence />} />
        <Route path="inventory" element={<InventoryHub />} />
        <Route path="warehouses" element={<WarehousesHub />} />
        <Route path="procurement" element={<ProcurementHub />} />
        <Route path="suppliers" element={<ProcurementHub />} />
        <Route path="purchase-orders" element={<ProcurementHub />} />
        <Route path="analytics" element={<AnalyticsHub />} />
        <Route path="reports" element={<ReportsCenter />} />

        {/* Commerce and Catalog */}
        <Route path="products" element={<AdminProducts />} />
        <Route path="products/new" element={<ProductEditor />} />
        <Route path="products/:id" element={<ProductEditor />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="orders/:id" element={<AdminOrderDetail />} />
        <Route path="customers" element={<AdminCustomers />} />

        {/* Governance and Platform */}
        <Route path="staff" element={<AdminStaff />} />
        <Route path="roles" element={<AdminRoles />} />
        <Route path="audit" element={<AdminAudit />} />
        <Route path="medusa" element={<AdminMedusa />} />

        {/* ML operations console — its own navigation inside the
            admin shell, sharing the same session and permissions. */}
        <Route path="ml" element={<MlLayout />}>
          <Route index element={<MlDashboard />} />
          <Route path="models" element={<MlModels />} />
          <Route path="models/:key" element={<MlModelDetail />} />
          <Route path="forecast" element={<MlForecast />} />
          <Route path="recommendations" element={<MlRecommendations />} />
          <Route path="data" element={<MlData />} />
        </Route>

        {/* Without this, an unmatched /admin/* URL fell through to the
            storefront catch-all and dropped the operator onto the
            shopper 404, outside the admin entirely. */}
        <Route path="*" element={<AdminNotFound />} />
      </Route>

      <Route element={<Layout />}>
        {/* 1. Homepage */}
        <Route index element={<Home />} />

        {/* 2-5. Browse, listing, detail, search */}
        <Route path="categories" element={<Categories />} />
        <Route path="category/:slug" element={<Category />} />
        <Route path="product/:id" element={<Product />} />
        <Route path="search" element={<Search />} />

        {/* 6. Login / Create account */}
        <Route path="account/auth" element={<Auth />} />

        {/* 7. Mini cart lives in the shell.  8. Cart page */}
        <Route path="cart" element={<Cart />} />
        <Route path="wishlist" element={<Wishlist />} />
        <Route path="membership" element={<Membership />} />

        {/* 9-13. Checkout flow */}
        <Route path="checkout" element={<Navigate to="/checkout/login" replace />} />
        <Route path="checkout/login" element={<CheckoutIdentify />} />
        <Route path="checkout/shipping" element={<CheckoutShipping />} />
        <Route path="checkout/payment" element={<CheckoutPayment />} />
        <Route path="checkout/review" element={<CheckoutReview />} />
        <Route path="order/confirmation/:id" element={<OrderConfirmation />} />

        {/* 14-18. Account */}
        <Route path="account" element={<Navigate to="/account/orders" replace />} />
        <Route path="account/orders" element={<Orders />} />
        <Route path="account/orders/:id" element={<OrderDetail />} />
        <Route path="account/profile" element={<Profile />} />
        <Route path="account/payment" element={<PaymentSettings />} />
        <Route path="account/addresses" element={<Addresses />} />

        {/* 19-25. Service and content */}
        <Route path="signup" element={<Signup />} />
        <Route path="returns" element={<Returns />} />
        <Route path="shipping" element={<ShippingInfo />} />
        <Route path="help" element={<Help />} />
        <Route path="stores" element={<Stores />} />
        <Route path="stores/:id" element={<StoreDetail />} />
        <Route path="legal" element={<Legal />} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
