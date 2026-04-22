import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ShoppingBag, X, Menu, Search, Instagram, ArrowRight, Check, CreditCard, Truck, MapPin, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useCartStore } from '../store/cartStore';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// --- UTILS ---
const formatPrice = (price) => `S/. ${(price || 0).toLocaleString('es-PE')}`;

const SUPER_SECTIONS = ['Todos', 'Zapatillas', 'Ropa', 'Accesorios', 'Cuidado', 'Otros'];

const getSectionForProduct = (categorias) => {
  if (!categorias || categorias.length === 0) return 'Otros';
  const text = categorias.join(' ').toUpperCase();
  
  if (/(LIMPIEZA|REPELENTE|ACONDICIONADOR|PAñOS)/.test(text)) return 'Cuidado';
  if (/(HOODIE|SHIRT|PANTALON|JEANS|CASACA|CAMISA|SHORT|POLERA|SWEATER|SUETER|JACKET|CONJUNTO|BUZO|PANTS|BOXER|CAFARENA|TOP|JERSEY|MEDIAS|LONG SLEEVE)/.test(text)) return 'Ropa';
  if (/(BILLETERA|WALLET|CARTERA|CORREA|GORRA|MOCHILA|MORRAL|PELUCHE|TAZAS|TOALLA|LENTES|GLASSES|MUñECO|TARJETERO|ENCENDEDOR)/.test(text)) return 'Accesorios';
  if (/(JORDAN|YEEZY|AF1|AIR FORCE|DUNK|AIR MAX|350|700|BAPE|TRAINER|SLIDE|OODSY|CLASSIC|CAMPUS|GAZELLE|SHOX|RESPONSE|CONVERSE|VANS|VULC|SNEAKER|LOW|HIGH|MID|BOOT|PORTOFINO|SANDALIA|SKEL)/.test(text)) return 'Zapatillas';
  
  return 'Otros';
};

// --- COMPONENTS ---

const Marquee = () => (
  <div className="bg-neon-green text-black overflow-hidden py-2 border-b-2 border-black whitespace-nowrap sticky top-0 z-[60]">
    <div className="animate-marquee inline-block font-mono font-bold text-sm tracking-tighter uppercase">
      &nbsp;• ENVÍOS GRATIS +S/.500 • SOLO ORIGINALES • NUEVOS DROPS CADA VIERNES • JUS CHIRI EXCLUSIVE • ENVÍOS GRATIS +S/.500 • SOLO ORIGINALES •
    </div>
  </div>
);

const Navbar = ({ cartCount, onOpenCart, searchQuery, setSearchQuery, onOpenMenu }) => {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <nav className="sticky top-9 z-50 bg-white border-b-2 border-black">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20 relative">
          <div className="flex items-center gap-6 w-1/3">
            <Menu className="w-8 h-8 cursor-pointer hover:opacity-50 transition-opacity" onClick={onOpenMenu} />
            <div className={`hidden sm:flex items-center transition-all overflow-hidden ${showSearch ? 'w-64 border-b-2 border-black' : 'w-6'}`}>
                <Search 
                    className="w-6 h-6 cursor-pointer hover:opacity-50 flex-shrink-0" 
                    onClick={() => setShowSearch(!showSearch)}
                />
                <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar producto, marca..."
                    className={`ml-2 outline-none font-mono text-sm w-full bg-transparent transition-opacity duration-300 ${showSearch ? 'opacity-100' : 'opacity-0'}`}
                />
            </div>
          </div>

          <div className="w-1/3 text-center flex justify-center">
              <h1 className="font-black text-3xl tracking-tighter uppercase italic cursor-pointer">JUS CHIRI®</h1>
          </div>

          <div className="flex items-center justify-end w-1/3 gap-6">
            <button 
              onClick={onOpenCart}
              className="relative p-2 hover:bg-black hover:text-white transition-colors border-2 border-transparent hover:border-black rounded-none group"
            >
              <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm hidden sm:block">CART [{cartCount}]</span>
                  <ShoppingBag className="w-6 h-6" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

const Hero = () => (
  <div className="relative border-b-2 border-black overflow-hidden group">
    <div className="grid grid-cols-1 lg:grid-cols-2 h-[80vh]">
      <div className="relative flex flex-col justify-center px-8 lg:px-16 bg-white border-b-2 lg:border-b-0 lg:border-r-2 border-black z-10">
        <span className="font-mono text-xs mb-4 inline-block bg-black text-white px-2 py-1 w-max rotate-1">
            FW24 COLLECTION / DROP 01
        </span>
        <h1 className="text-6xl sm:text-8xl font-black leading-[0.85] tracking-tighter uppercase mb-6 mix-blend-multiply">
          Street<br/>Wear<br/>Cult.
        </h1>
        <p className="font-mono text-sm max-w-md mb-8 leading-relaxed border-l-4 border-neon-green pl-4">
          La curaduría más estricta de Lima. Piezas de archivo y los últimos lanzamientos de hype mundial. No apto para tímidos.
        </p>
        <a href="#shop" className="w-full sm:w-auto bg-black text-white font-bold text-lg px-8 py-4 uppercase tracking-wider hover:bg-neon-green hover:text-black transition-colors border-2 border-black text-center">
          Explorar Drop
        </a>
      </div>
      <div className="relative h-full overflow-hidden bg-gray-100">
         <img
          className="absolute inset-0 w-full h-full object-cover grayscale contrast-125 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 ease-out"
          src="https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=2070&auto=format&fit=crop"
          alt="Sneakers"
        />
      </div>
    </div>
  </div>
);

const ProductCard = React.memo(({ product, onAddToCart }) => (
  <div className="group relative bg-white border-2 border-transparent hover:border-black transition-all duration-300 flex flex-col h-full animate-fade-in-up">
    <div className="relative aspect-[4/5] bg-gray-50 overflow-hidden border-b-2 border-gray-100 group-hover:border-black transition-colors flex items-center justify-center p-4">
      {product.stock_actual <= 0 && (
        <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-3 py-1 uppercase border-l-2 border-b-2 border-black z-10">
          Agotado
        </span>
      )}
      <img
        src={product.imagen_url || 'https://via.placeholder.com/400?text=No+Image'}
        alt={product.nombre}
        loading="lazy"
        className="h-full w-full object-contain group-hover:scale-110 transition-transform duration-700 ease-in-out mix-blend-multiply"
      />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
        {product.stock_actual > 0 ? (
          <button
            onClick={() => onAddToCart(product)}
            className="bg-white text-black font-bold uppercase text-sm px-6 py-3 hover:bg-neon-green border-2 border-black transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 shadow-xl"
          >
            Agregar al Carrito
          </button>
        ) : (
          <button className="bg-gray-200 text-gray-500 font-bold uppercase text-sm px-6 py-3 border-2 border-black cursor-not-allowed">
            Sin Stock
          </button>
        )}
      </div>
    </div>
    <div className="p-4 flex-1 flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-2">
            <p className="font-mono text-xs text-gray-500 uppercase">{product.codigo}</p>
            <p className="font-bold text-sm uppercase tracking-wide">{product.marca}</p>
        </div>
        <h3 className="text-sm sm:text-base font-black uppercase leading-tight mb-2 hover:underline decoration-2 line-clamp-2">
            {product.nombre}
        </h3>
      </div>
      <div className="mt-4 pt-4 border-t-2 border-gray-100 group-hover:border-black transition-colors flex justify-between items-center">
        <p className="font-mono font-bold text-lg">{formatPrice(product.precio)}</p>
      </div>
    </div>
  </div>
));

const CheckoutStepIndicator = ({ step }) => (
  <div className="flex justify-between mb-8 px-2 relative">
     <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -z-10"></div>
    {['cart', 'shipping', 'payment'].map((s) => {
        const isActive = step === s || (step === 'success');
        const isPast = ['shipping', 'payment', 'success'].includes(step) && s === 'cart' 
            || ['payment', 'success'].includes(step) && s === 'shipping';
        return (
            <div key={s} className={`flex flex-col items-center bg-white px-2 ${isActive || isPast ? 'text-black' : 'text-gray-300'}`}>
                <div className={`w-4 h-4 rounded-full border-2 ${isActive || isPast ? 'border-black bg-black' : 'border-gray-300 bg-white'} mb-1`}></div>
                <span className="text-[10px] uppercase font-bold tracking-widest">{s}</span>
            </div>
        )
    })}
  </div>
);

const CheckoutModal = ({ isOpen, onClose, cart, total, onClearCart, onRemoveItem }) => {
    const [step, setStep] = useState('cart');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [shippingData, setShippingData] = useState({
        nombre: '',
        direccion: '',
        telefono: ''
    });

    useEffect(() => {
        if(isOpen) {
            setStep('cart');
            setError(null);
        }
    }, [isOpen]);

    const handleNext = async () => {
        if (step === 'cart') setStep('shipping');
        else if (step === 'shipping') {
            if (!shippingData.nombre || !shippingData.direccion) {
                setError("Por favor completa los datos de envío");
                return;
            }
            setError(null);
            setStep('payment');
        }
        else if (step === 'payment') {
            setLoading(true);
            try {
                const res = await fetch(`${API_URL}/sales`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        cart,
                        total,
                        cliente: shippingData
                    })
                });
                if (res.ok) {
                    setStep('success');
                    onClearCart();
                } else {
                    const data = await res.json();
                    setError(data.error || "Error al procesar la orden");
                }
            } catch (err) {
                setError("Ocurrió un error inesperado");
            }
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white w-full max-w-2xl h-full sm:h-auto sm:max-h-[90vh] relative flex flex-col shadow-2xl overflow-hidden sm:border-2 sm:border-black">
                <div className="p-6 border-b-2 border-black flex justify-between items-center bg-gray-50">
                    <h2 className="text-xl font-black uppercase tracking-tighter">
                        {step === 'success' ? 'Orden Confirmada' : 'Checkout Seguro'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-black hover:text-white transition-colors border-2 border-transparent">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 sm:p-8">
                    {step !== 'success' && <CheckoutStepIndicator step={step} />}

                    {step === 'cart' && (
                        <div className="space-y-6">
                            {cart.length === 0 ? (
                                <p className="text-center font-mono py-10">Tu carrito está vacío.</p>
                            ) : (
                                cart.map((item, index) => (
                                    <div key={index} className="flex gap-4 border-b border-gray-100 pb-4">
                                        <div className="w-20 h-20 bg-gray-100 flex-shrink-0 border border-gray-200">
                                            <img src={item.imagen_url} className="w-full h-full object-contain p-1 mix-blend-multiply" alt="" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-sm uppercase">{item.nombre}</h4>
                                                <button 
                                                    onClick={() => onRemoveItem(index)}
                                                    className="p-1 px-2 text-gray-300 hover:text-red-500 transition-colors"
                                                    title="Eliminar producto"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            <p className="text-xs font-mono text-gray-500 mb-2">{item.codigo}</p>
                                            <p className="font-bold text-sm">{formatPrice(item.precio)}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                            {cart.length > 0 && (
                                <div className="bg-gray-50 p-4 border border-gray-200">
                                    <div className="flex justify-between font-bold text-lg mb-1">
                                        <span>TOTAL</span>
                                        <span>{formatPrice(total)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 'shipping' && (
                        <div className="space-y-4">
                            <h3 className="font-bold uppercase mb-4 flex items-center gap-2"><MapPin className="w-4 h-4" /> Datos de Envío</h3>
                            {error && <p className="text-red-500 text-xs font-bold uppercase">{error}</p>}
                            <div className="grid grid-cols-2 gap-4">
                                <input 
                                    placeholder="Nombre Completo" 
                                    className="col-span-2 p-3 border-2 border-gray-200 focus:border-black outline-none font-mono text-sm" 
                                    value={shippingData.nombre}
                                    onChange={e => setShippingData({...shippingData, nombre: e.target.value})}
                                />
                                <input 
                                    placeholder="Dirección" 
                                    className="col-span-2 p-3 border-2 border-gray-200 focus:border-black outline-none font-mono text-sm" 
                                    value={shippingData.direccion}
                                    onChange={e => setShippingData({...shippingData, direccion: e.target.value})}
                                />
                                <input 
                                    placeholder="Teléfono / WhatsApp" 
                                    className="col-span-2 p-3 border-2 border-gray-200 focus:border-black outline-none font-mono text-sm" 
                                    value={shippingData.telefono}
                                    onChange={e => setShippingData({...shippingData, telefono: e.target.value})}
                                />
                            </div>
                        </div>
                    )}

                    {step === 'payment' && (
                        <div className="space-y-6">
                            {error && <p className="text-red-500 text-xs font-bold uppercase">{error}</p>}
                            <div className="bg-black text-white p-4 text-center mb-6">
                                <span className="font-mono text-sm">TOTAL A PAGAR:</span>
                                <div className="text-3xl font-black">{formatPrice(total)}</div>
                            </div>
                            <div className="space-y-3">
                                <label className="flex items-center gap-4 p-4 border-2 border-black cursor-pointer bg-gray-50">
                                    <CreditCard className="w-6 h-6" />
                                    <div className="flex-1">
                                        <div className="font-bold text-sm uppercase">Acordar por WhatsApp</div>
                                        <div className="text-xs text-gray-500">Coordinaremos el pago por interno</div>
                                    </div>
                                    <div className="w-4 h-4 border-2 border-black rounded-full bg-black"></div>
                                </label>
                            </div>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="text-center py-10">
                            <div className="w-24 h-24 bg-neon-green rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-black">
                                <Check className="w-12 h-12 text-black" strokeWidth={4} />
                            </div>
                            <h2 className="text-3xl font-black uppercase mb-2">¡Orden Recibida!</h2>
                            <p className="max-w-md mx-auto text-gray-600 mb-8">
                                Gracias por tu compra. Nos estaremos contactando en breve para la entrega.
                            </p>
                            <button onClick={onClose} className="w-full bg-black text-white py-4 font-bold uppercase tracking-widest hover:bg-gray-900">
                                Volver a la tienda
                            </button>
                        </div>
                    )}
                </div>

                {step !== 'success' && (
                    <div className="p-6 border-t-2 border-black bg-white flex gap-4">
                        {step !== 'cart' && (
                            <button onClick={() => setStep(step === 'payment' ? 'shipping' : 'cart')} className="flex-1 py-4 font-bold uppercase text-sm border-2 border-black hover:bg-gray-100">
                                Atrás
                            </button>
                        )}
                        <button 
                            onClick={handleNext}
                            disabled={cart.length === 0 || loading}
                            className="flex-[2] py-4 bg-black text-white font-bold uppercase text-sm tracking-widest hover:bg-neon-green hover:text-black border-2 border-black disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {loading ? 'Procesando...' : step === 'payment' ? 'Confirmar Pedido' : 'Continuar'}
                            {!loading && <ArrowRight className="w-4 h-4" />}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const Sidebar = ({ isOpen, onClose, activeSegment, onSelectSegment }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-80 max-w-[80vw] bg-white h-full border-r-2 border-black flex flex-col shadow-2xl">
                <div className="p-6 border-b-2 border-black flex justify-between items-center bg-neon-green">
                    <h2 className="font-black text-2xl uppercase tracking-tighter italic">MENU</h2>
                    <button onClick={onClose} className="p-2 hover:bg-black hover:text-white transition-colors border-2 border-black bg-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    <div className="space-y-4">
                        <h3 className="font-mono text-xs text-gray-500 uppercase font-bold tracking-widest">Catálogo</h3>
                        {SUPER_SECTIONS.map(sec => (
                            <button
                                key={sec}
                                onClick={() => { onSelectSegment(sec); onClose(); }}
                                className={`block w-full text-left font-black text-2xl uppercase tracking-tighter hover:text-neon-green transition-colors ${activeSegment === sec ? 'text-black underline' : 'text-gray-400'}`}
                            >
                                {sec}
                            </button>
                        ))}
                    </div>
                    <div className="border-t-2 border-gray-100 pt-6 space-y-4">
                        <h3 className="font-mono text-xs text-gray-500 uppercase font-bold tracking-widest">Portal</h3>
                        <a href="/admin" className="flex items-center gap-2 text-sm font-bold uppercase hover:underline">
                            Panel Ténico / Admin
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function Storefront() {
  const [activeSegment, setActiveSegment] = useState("Todos");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(24);
  const observerRef = useRef(null);

  const cart = useCartStore(state => state.cart);
  const addToCartAction = useCartStore(state => state.addToCart);
  const removeFromCart = useCartStore(state => state.removeFromCart);
  const clearCart = useCartStore(state => state.clearCart);
  const cartTotal = cart.reduce((sum, item) => sum + (item.precio || 0), 0);

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const prodRes = await fetch(`${API_URL}/products?limit=2500`);
        const prodData = await prodRes.json();
        
        // Asignamos la súper-sección a cada producto para no recalcular
        const mappedProducts = (prodData.products || []).map(p => ({
            ...p,
            superSection: getSectionForProduct(p.categorias)
        }));
        
        setProducts(mappedProducts);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleAddToCart = useCallback((product) => {
    addToCartAction(product);
    setNotification(`${product.nombre} agregado al carrito`);
    setTimeout(() => setNotification(null), 3000);
  }, [addToCartAction]);

  // FILTER LOGIC - Memoized for performance
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (activeSegment !== 'Todos' && p.superSection !== activeSegment) return false;
      if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const textToSearch = `${p.nombre} ${p.marca} ${p.codigo}`.toLowerCase();
          if (!textToSearch.includes(q)) return false;
      }
      if (priceMin && p.precio < Number(priceMin)) return false;
      if (priceMax && p.precio > Number(priceMax)) return false;
      if (inStockOnly && p.stock_actual <= 0) return false;
      return true;
    }).sort((a, b) => {
      // Priority 1: Stock
      const stockA = a.stock_actual > 0 ? 1 : 0;
      const stockB = b.stock_actual > 0 ? 1 : 0;
      if (stockA !== stockB) return stockB - stockA;

      // Priority 2: Has Image
      const imgA = (a.imagen_url && !a.imagen_url.includes('placeholder')) ? 1 : 0;
      const imgB = (b.imagen_url && !b.imagen_url.includes('placeholder')) ? 1 : 0;
      if (imgA !== imgB) return imgB - imgA;

      // Priority 3: Has Price (assuming > 0 is better than 0 or null)
      const priceA = a.precio > 0 ? 1 : 0;
      const priceB = b.precio > 0 ? 1 : 0;
      if (priceA !== priceB) return priceB - priceA;

      return 0;
    });
  }, [products, activeSegment, searchQuery, priceMin, priceMax, inStockOnly]);

  // Infinite Scroll Trigger
  const lastElementRef = useCallback(node => {
    if (loading) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && displayLimit < filteredProducts.length) {
        setDisplayLimit(prev => prev + 24);
      }
    });
    if (node) observerRef.current.observe(node);
  }, [loading, displayLimit, filteredProducts.length]);

  // Reset limit on filter change
  useEffect(() => {
    setDisplayLimit(24);
  }, [activeSegment, searchQuery, priceMin, priceMax, inStockOnly]);

  return (
    <div className="font-sans antialiased bg-white text-gray-900 selection:bg-neon-green min-h-screen flex flex-col">
      {notification && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[70] bg-black text-white px-6 py-3 font-bold uppercase tracking-wide shadow-2xl flex items-center gap-2 border border-neon-green">
            <Check className="w-4 h-4 text-neon-green" />
            {notification}
        </div>
      )}

      <Marquee />
      
      <Navbar 
        cartCount={cart.length} 
        onOpenCart={() => setIsCheckoutOpen(true)} 
        onOpenMenu={() => setIsSidebarOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        activeSegment={activeSegment}
        onSelectSegment={(sec) => {
            setActiveSegment(sec);
            document.getElementById('shop').scrollIntoView({ behavior: 'smooth' });
        }}
      />
      
      <CheckoutModal 
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        total={cartTotal}
        onClearCart={clearCart}
        onRemoveItem={removeFromCart}
      />

      <Hero />

      <main id="shop" className="flex-1 w-full max-w-[1920px] mx-auto">
        {/* Nav sticky (Pills & Filtros Toggle) */}
        <div className="sticky top-28 z-40 bg-white/95 backdrop-blur-md border-b-2 border-black">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:px-8 gap-4">
                
                {/* Categorías Principales */}
                <div className="flex gap-3 min-w-max overflow-x-auto no-scrollbar w-full sm:w-auto pb-2 sm:pb-0">
                    {SUPER_SECTIONS.map((sec) => (
                        <button
                            key={sec}
                            onClick={() => setActiveSegment(sec)}
                            className={`font-mono text-sm shadow-sm uppercase px-5 py-2 border-2 transition-all flex-shrink-0 ${
                                activeSegment === sec 
                                ? 'bg-black text-white border-black font-bold shadow-[3px_3px_0px_0px_rgba(204,255,0,1)] -translate-y-0.5' 
                                : 'bg-white text-gray-500 border-gray-200 hover:border-black hover:text-black hover:-translate-y-0.5'
                            }`}
                        >
                            {sec}
                        </button>
                    ))}
                </div>

                {/* Botón Switch Filtros */}
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 font-mono font-bold text-sm uppercase px-4 py-2 border-2 transition-colors ${showFilters ? 'bg-neon-green border-black' : 'bg-white border-gray-200 hover:border-black'}`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filtros
                </button>
            </div>

            {/* Panel de Filtros Expandible */}
            {showFilters && (
                <div className="border-t-2 border-black bg-gray-50 p-4 sm:px-8 animate-fade-in flex flex-wrap gap-6 items-center">
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-xs uppercase font-bold text-gray-500">Precio S/.</span>
                        <input 
                            type="number" 
                            placeholder="Min" 
                            value={priceMin}
                            onChange={(e) => setPriceMin(e.target.value)}
                            className="w-20 p-2 border-2 border-gray-200 focus:border-black outline-none font-mono text-sm"
                        />
                        <span className="font-mono text-gray-400">-</span>
                        <input 
                            type="number" 
                            placeholder="Max" 
                            value={priceMax}
                            onChange={(e) => setPriceMax(e.target.value)}
                            className="w-20 p-2 border-2 border-gray-200 focus:border-black outline-none font-mono text-sm"
                        />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer group">
                        <div className={`w-5 h-5 flex justify-center items-center border-2 transition-colors ${inStockOnly ? 'bg-black border-black text-neon-green' : 'bg-white border-gray-300 group-hover:border-black'}`}>
                            {inStockOnly && <Check className="w-4 h-4" strokeWidth={4} />}
                        </div>
                        <input 
                            type="checkbox" 
                            className="hidden" 
                            checked={inStockOnly}
                            onChange={(e) => setInStockOnly(e.target.checked)}
                        />
                        <span className="font-mono text-sm uppercase font-bold">Solo en Stock</span>
                    </label>

                    {(priceMin || priceMax || inStockOnly || searchQuery) && (
                         <button 
                            onClick={() => { setPriceMin(''); setPriceMax(''); setInStockOnly(false); setSearchQuery(''); }}
                            className="text-xs font-mono font-bold text-gray-500 underline hover:text-black ml-auto"
                         >
                             Limpiar Filtros
                         </button>
                    )}
                </div>
            )}
        </div>

        {/* Búsqueda en Móviles (Opcional, pero cubierto por la barra) */}
        <div className="sm:hidden px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center">
            <Search className="w-5 h-5 text-gray-400" />
            <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o código..."
                className="w-full bg-transparent border-none outline-none font-mono text-sm px-3"
            />
        </div>

        <div className="p-4 sm:px-8">
            <p className="font-mono text-xs text-gray-500 uppercase">
                Mostrando {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''}
            </p>
        </div>

        {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
               <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
               <div className="font-mono font-bold text-sm tracking-widest uppercase">Cargando Heat...</div>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 border-t-2 border-l-2 border-gray-100">
              {filteredProducts.slice(0, displayLimit).map((product, index) => (
                <div 
                    key={product.codigo} 
                    ref={index === filteredProducts.slice(0, displayLimit).length - 1 ? lastElementRef : null}
                    className="border-r-2 border-b-2 border-gray-100 hover:border-black transition-colors z-0 hover:z-10 -ml-[2px] -mt-[2px] first:ml-0"
                >
                    <ProductCard product={product} onAddToCart={handleAddToCart} />
                </div>
              ))}
              {filteredProducts.length === 0 && (
                  <div className="py-32 text-center col-span-full flex flex-col items-center gap-4">
                      <Search className="w-12 h-12 text-gray-300" />
                      <p className="font-mono text-lg font-bold text-gray-400 uppercase">No encontramos lo que buscas.</p>
                      <button onClick={() => { setActiveSegment('Todos'); setSearchQuery(''); setPriceMin(''); setPriceMax(''); setInStockOnly(false); }} className="text-sm font-bold border-b-2 border-black hover:text-neon-green hover:border-neon-green transition-colors">Ver todo el catálogo</button>
                  </div>
              )}
            </div>
        )}
      </main>

      <footer className="bg-black text-white py-10 mt-auto border-t-8 border-neon-green text-center font-mono text-xs text-gray-500 uppercase">
          © 2024 Jus Chiri International. All rights reserved.
      </footer>
    </div>
  );
}