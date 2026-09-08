/* =============================================================
   AURELIS - GLOBAL STORE
   Session snapshot + commerce actions + UI layer control.
   ============================================================= */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api, { ApiError } from '../lib/api';

const StoreContext = createContext(null);

const EMPTY_SESSION = {
  sessionId: null,
  user: null,
  cart: [],
  totals: { subtotal: 0, discount: 0, shipping: 0, tax: 0, total: 0, count: 0, engravingUnlocked: false, engravingRemaining: 400000, engravingThreshold: 400000, instalmentThreshold: 165000, instalmentEligible: false },
  wishlist: [],
  recent: [],
  addresses: [],
  cards: [],
  orders: [],
  prefs: { email: true, sms: false, post: false, currency: 'INR' },
  checkout: { mode: null, email: '', shipTo: null, method: 'std', payment: 'card', cardId: null, billingSame: true, gift: false, giftNote: '', engraving: '', promo: null, pickupStore: 'gva' }
};

let toastSeq = 0;

export function StoreProvider({ children }) {
  const [session, setSession] = useState(EMPTY_SESSION);
  const [content, setContent] = useState(null);
  const [categories, setCategories] = useState([]);
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [layer, setLayer] = useState(null); /* 'cart' | 'nav' | 'search' | null */
  const [busy, setBusy] = useState(false);
  const toastTimers = useRef(new Map());

  /* ---------- toasts ---------- */
  const dismissToast = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const timer = toastTimers.current.get(id);
    if (timer) { clearTimeout(timer); toastTimers.current.delete(id); }
  }, []);

  const toast = useCallback((message, icon = 'check') => {
    const id = ++toastSeq;
    setToasts((list) => [...list, { id, message, icon }]);
    const timer = setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
      toastTimers.current.delete(id);
    }, 3400);
    toastTimers.current.set(id, timer);
    return id;
  }, []);

  useEffect(() => {
    const timers = toastTimers.current;
    return () => { timers.forEach(clearTimeout); timers.clear(); };
  }, []);

  /* ---------- boot ---------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [snap, cats, cnt] = await Promise.all([api.session(), api.categories(), api.content()]);
        if (cancelled) return;
        setSession(snap);
        setCategories(cats);
        setContent(cnt);
        setOffline(false);
      } catch (err) {
        if (cancelled) return;
        setOffline(true);
        console.error('[aurelis] boot failed:', err);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* ---------- action wrapper ---------- */
  const run = useCallback(async (fn, { success, failure, silent } = {}) => {
    setBusy(true);
    try {
      const result = await fn();
      if (result && result.cart !== undefined && result.totals !== undefined) setSession(result);
      if (success && !silent) toast(typeof success === 'function' ? success(result) : success);
      return { ok: true, data: result };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
      if (!silent) toast(failure || message, 'close');
      return { ok: false, error: message };
    } finally {
      setBusy(false);
    }
  }, [toast]);

  /* ---------- layers ---------- */
  const openLayer = useCallback((which) => setLayer(which), []);
  const closeLayer = useCallback(() => setLayer(null), []);

  useEffect(() => {
    document.body.classList.toggle('is-locked', !!layer);
    return () => document.body.classList.remove('is-locked');
  }, [layer]);

  useEffect(() => {
    if (!layer) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setLayer(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [layer]);

  /* ---------- commerce actions ---------- */
  const addToCart = useCallback(async (payload, opts = {}) => {
    const res = await run(() => api.addToCart(payload), { silent: true });
    if (res.ok) {
      toast(`${opts.name || 'Piece'} added to your bag.`, 'bag');
      if (opts.openCart !== false) setLayer('cart');
    } else {
      toast(res.error, 'close');
    }
    return res;
  }, [run, toast]);

  const setLineQty = useCallback((key, qty) => run(() => api.setLineQty(key, qty), { silent: true }), [run]);
  const removeLine = useCallback((key) => run(() => api.removeLine(key), { success: 'Removed from your bag.' }), [run]);
  const saveForLater = useCallback((key) => run(() => api.saveLineForLater(key), { success: 'Moved to saved pieces.' }), [run]);
  const emptyCart = useCallback(() => run(() => api.emptyCart(), { success: 'Bag emptied.' }), [run]);

  const applyPromo = useCallback(async (code) => {
    const res = await run(() => api.applyPromo(code), { silent: true });
    toast(res.ok ? (res.data.message || 'Code applied.') : res.error, res.ok ? 'sparkle' : 'close');
    return res;
  }, [run, toast]);

  const clearPromo = useCallback(() => run(() => api.clearPromo(), { success: 'Code removed.' }), [run]);

  const toggleWish = useCallback(async (id, name) => {
    const res = await run(() => api.toggleWish(id), { silent: true });
    if (res.ok) toast(res.data.saved ? `${name || 'Piece'} saved.` : `${name || 'Piece'} removed from saved.`, 'heart');
    return res;
  }, [run, toast]);

  const markRecent = useCallback((id) => { api.markRecent(id).catch(() => {}); }, []);

  const login = useCallback((payload) => run(() => api.login(payload), { silent: true }), [run]);
  const register = useCallback((payload) => run(() => api.register(payload), { silent: true }), [run]);
  const logout = useCallback(() => run(() => api.logout(), { success: 'Signed out.' }), [run]);

  const updateProfile = useCallback((payload) => run(() => api.updateProfile(payload), { success: 'Profile updated.' }), [run]);
  const updatePrefs = useCallback((payload) => run(() => api.updatePrefs(payload), { silent: true }), [run]);

  const addAddress = useCallback((payload) => run(() => api.addAddress(payload), { success: 'Address saved.' }), [run]);
  const updateAddress = useCallback((id, payload) => run(() => api.updateAddress(id, payload), { success: 'Address updated.' }), [run]);
  const removeAddress = useCallback((id) => run(() => api.removeAddress(id), { success: 'Address removed.' }), [run]);
  const defaultAddress = useCallback((id) => run(() => api.defaultAddress(id), { success: 'Default address set.' }), [run]);

  const addCard = useCallback((payload) => run(() => api.addCard(payload), { success: 'Card saved.' }), [run]);
  const removeCard = useCallback((id) => run(() => api.removeCard(id), { success: 'Card removed.' }), [run]);
  const defaultCard = useCallback((id) => run(() => api.defaultCard(id), { success: 'Default card set.' }), [run]);

  const patchCheckout = useCallback((payload) => run(() => api.patchCheckout(payload), { silent: true }), [run]);

  const placeOrder = useCallback(async () => {
    setBusy(true);
    try {
      const data = await api.placeOrder();
      setSession(data.session);
      return { ok: true, order: data.order };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'We could not place the order.';
      toast(message, 'close');
      return { ok: false, error: message };
    } finally {
      setBusy(false);
    }
  }, [toast]);

  const refresh = useCallback(async () => {
    try { setSession(await api.session()); } catch { /* keep last good */ }
  }, []);

  const isWished = useCallback((id) => session.wishlist.includes(id), [session.wishlist]);

  const value = useMemo(() => ({
    session, categories, content, ready, offline, busy,
    toasts, toast, dismissToast,
    layer, openLayer, closeLayer,
    addToCart, setLineQty, removeLine, saveForLater, emptyCart,
    applyPromo, clearPromo, toggleWish, isWished, markRecent,
    login, register, logout,
    updateProfile, updatePrefs,
    addAddress, updateAddress, removeAddress, defaultAddress,
    addCard, removeCard, defaultCard,
    patchCheckout, placeOrder, refresh
  }), [
    session, categories, content, ready, offline, busy, toasts, toast, dismissToast,
    layer, openLayer, closeLayer, addToCart, setLineQty, removeLine, saveForLater, emptyCart,
    applyPromo, clearPromo, toggleWish, isWished, markRecent, login, register, logout,
    updateProfile, updatePrefs, addAddress, updateAddress, removeAddress, defaultAddress,
    addCard, removeCard, defaultCard, patchCheckout, placeOrder, refresh
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

export default StoreContext;
