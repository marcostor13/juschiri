import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, X, Menu, Search, ArrowRight, Check, CreditCard, MapPin, SlidersHorizontal, Trash2, ShoppingCart, Loader2, ChevronDown } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { Notification, ConfirmModal } from '../components/ui';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const formatPrice = (price) => `S/. ${(price || 0).toLocaleString('es-PE')}`;
const isVideo = (url) => url && /\.(mp4|webm|ogg|mov)$/i.test(url);

// ── Marquee ───────────────────────────────────────────────────────────────────

const Marquee = ({ text }) => {
  const content = text || '• ENVÍOS GRATIS +S/.500 • SOLO ORIGINALES • NUEVOS DROPS CADA VIERNES • JUS CHIRI EXCLUSIVE •';
  return (
    <div className="bg-black text-white overflow-hidden py-2.5 whitespace-nowrap sticky top-0 z-[60]">
      <div className="animate-marquee inline-block text-[10px] font-bold tracking-[0.2em] uppercase">
        &nbsp;{content} &nbsp;&nbsp;&nbsp; {content} &nbsp;&nbsp;&nbsp; {content} &nbsp;&nbsp;&nbsp; {content}
      </div>
    </div>
  );
};

// ── Navbar ────────────────────────────────────────────────────────────────────

const Navbar = ({ cartCount, onOpenCart, searchQuery, setSearchQuery, onOpenMenu }) => {
  const [showSearch, setShowSearch] = useState(false);
  const [isBumping, setIsBumping] = useState(false);

  useEffect(() => {
    if (cartCount > 0) {
      setIsBumping(true);
      const t = setTimeout(() => setIsBumping(false), 400);
      return () => clearTimeout(t);
    }
  }, [cartCount]);

  return (
    <nav className="sticky top-8 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20 relative">
          <div className="flex items-center gap-6 w-1/3">
            <Menu className="w-6 h-6 cursor-pointer text-gray-800 hover:text-black transition-colors" strokeWidth={1.5} onClick={onOpenMenu} />
            <div className={`hidden sm:flex items-center transition-all overflow-hidden ${showSearch ? 'w-64 border-b border-gray-300' : 'w-6'}`}>
              <Search className="w-5 h-5 cursor-pointer text-gray-600 hover:text-black flex-shrink-0" strokeWidth={1.5} onClick={() => { if (showSearch) setSearchQuery(''); setShowSearch(!showSearch); }} />
              <input
                type="text" value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); if (e.target.value && window.scrollY < window.innerHeight * 0.5) document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' }); }}
                placeholder="Buscar marca o producto..."
                className={`ml-2 outline-none text-sm w-full bg-transparent transition-opacity duration-300 font-medium ${showSearch ? 'opacity-100' : 'opacity-0'}`}
              />
              {showSearch && searchQuery && <X className="w-4 h-4 cursor-pointer text-gray-400 hover:text-red-500" onClick={() => setSearchQuery('')} />}
            </div>
          </div>
          <div className="w-1/3 flex justify-center">
            <img src="/logo juschiri.jpeg" alt="JUS CHIRI" className="h-10 sm:h-12 object-contain mix-blend-multiply cursor-pointer" onClick={() => window.scrollTo(0, 0)} />
          </div>
          <div className="flex items-center justify-end w-1/3 gap-6">
            <button onClick={onOpenCart} className={`relative flex items-center gap-2 transition-all duration-300 group hover:opacity-70 ${isBumping ? 'scale-110' : ''}`}>
              <span className="font-semibold text-sm hidden sm:block tracking-wide">CARRITO</span>
              <div className="relative">
                <ShoppingBag strokeWidth={1.5} className="w-6 h-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-black text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">{cartCount}</span>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

// ── Hero Slider ───────────────────────────────────────────────────────────────

const HeroSlider = ({ customSlides }) => {
  const defaultSlides = [
    { title: 'The Grail Collection', subtitle: 'EXCLUSIVAS Y LIMITADAS', desc: 'Piezas de archivo y los lanzamientos más esperados a nivel mundial.', img: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=2070&auto=format&fit=crop', color: 'bg-[#0f4c3a]', textColor: 'text-white', buttonColor: 'bg-white text-[#0f4c3a] hover:bg-gray-100' },
    { title: 'Nuevas Siluetas', subtitle: 'DROP DE TEMPORADA', desc: 'Descubre la curaduría más estricta de este mes.', img: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?q=80&w=2074&auto=format&fit=crop', color: 'bg-[#F9EBEA]', textColor: 'text-gray-900', buttonColor: 'bg-gray-900 text-white hover:bg-black' },
    { title: 'Streetwear Premium', subtitle: 'HYPE APPAREL', desc: 'Eleva tu rotación con las marcas más codiciadas de la escena.', img: 'https://images.unsplash.com/photo-1515347619362-e6fdff686524?q=80&w=2069&auto=format&fit=crop', color: 'bg-zinc-900', textColor: 'text-white', buttonColor: 'bg-white text-zinc-900 hover:bg-gray-200' },
  ];
  const slides = customSlides?.length ? customSlides : defaultSlides;
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setCurrent(p => (p + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  return (
    <div className="relative overflow-hidden bg-gray-900 border-b border-gray-200 h-[85vh] lg:h-[70vh]">
      {slides.map((slide, idx) => (
        <div key={idx} className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === current ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
          <div className="lg:hidden absolute inset-0 overflow-hidden">
            <img className={`absolute inset-0 w-full h-full object-cover transition-transform duration-[10000ms] ease-out ${idx === current ? 'scale-110' : 'scale-100'}`} src={slide.img} alt={slide.title} loading={idx === 0 ? 'eager' : 'lazy'} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10" />
          </div>
          <div className="lg:hidden absolute inset-0 flex flex-col justify-end px-6 sm:px-10 pb-20 z-10 text-white">
            <span className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-70 mb-3">{slide.subtitle}</span>
            <h1 className="text-4xl sm:text-5xl font-black uppercase leading-[0.9] tracking-tighter mb-4">{slide.title}</h1>
            <p className="opacity-75 mb-8 text-sm sm:text-base leading-relaxed max-w-sm">{slide.desc}</p>
            <a href="#shop" className="w-full sm:w-max bg-black text-white border-2 border-black font-bold uppercase tracking-wider text-sm px-10 py-4 hover:bg-[#CCFF00] hover:text-black hover:border-[#CCFF00] transition-colors text-center">Explorar Catálogo</a>
          </div>
          <div className="hidden lg:grid lg:grid-cols-2 h-full">
            <div className={`relative flex flex-col justify-center px-24 z-10 transition-colors duration-1000 ${!slide.color?.startsWith('#') ? slide.color : ''} ${!slide.textColor?.startsWith('#') ? slide.textColor : ''}`} style={{ backgroundColor: slide.color?.startsWith('#') ? slide.color : undefined, color: slide.textColor?.startsWith('#') ? slide.textColor : undefined }}>
              <span className="text-xs font-semibold tracking-widest opacity-80 mb-4 uppercase">{slide.subtitle}</span>
              <h1 className="text-5xl xl:text-7xl font-bold leading-tight tracking-tight mb-6">{slide.title}</h1>
              <p className="opacity-90 mb-8 max-w-md text-lg">{slide.desc}</p>
              <a href="#shop" className={`w-max font-medium text-sm px-10 py-4 uppercase tracking-wider transition-colors text-center rounded-md ${slide.buttonColor}`}>Explorar Catálogo</a>
            </div>
            <div className="relative h-full overflow-hidden">
              <div className="absolute inset-0 bg-black/10 z-10" />
              <img className={`absolute inset-0 w-full h-full object-cover transition-transform duration-[10000ms] ease-out ${idx === current ? 'scale-110' : 'scale-100'}`} src={slide.img} alt={slide.title} loading={idx === 0 ? 'eager' : 'lazy'} />
            </div>
          </div>
        </div>
      ))}
      <div className="absolute bottom-8 left-6 sm:left-8 lg:left-24 z-20 flex gap-3">
        {slides.map((_, idx) => (
          <button key={idx} onClick={() => setCurrent(idx)} className={`h-1.5 rounded-full transition-all duration-500 ${idx === current ? 'w-8 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'}`} />
        ))}
      </div>
    </div>
  );
};

// ── Trending Gallery ───────────────────────────────────────────────────────────

const TrendingGallery = ({ customGallery }) => {
  const defaultItems = [
    { brand: 'Essentials', name: 'Dark Oatmeal', productId: '6a30aaf333ebc7e910d2c88d', img: 'https://aws-marcostorresalarcon-bucket.s3.us-east-2.amazonaws.com/products/16000043.jpeg', precio: 750, color: '#F5F0EB' },
    { brand: 'Off White', name: 'Diag Helvetica Off White Black', productId: '6a30aaf533ebc7e910d2c8bd', img: 'https://aws-marcostorresalarcon-bucket.s3.us-east-2.amazonaws.com/products/00004042.jpeg', precio: 2399, color: '#F4F4F4' },
    { brand: 'Supreme', name: 'Box Hoodie Sweatshirt Dark Red', productId: '6a30aaf633ebc7e910d2c8f3', img: 'https://aws-marcostorresalarcon-bucket.s3.us-east-2.amazonaws.com/products/00004387.jpeg', precio: 1300, color: '#FEF2F2' },
    { brand: 'Palm Angels', name: 'Allover Palms Bowling Shirt Black White', productId: '6a30aaf733ebc7e910d2c908', img: 'https://aws-marcostorresalarcon-bucket.s3.us-east-2.amazonaws.com/products/00003000.jpeg', precio: 1499, color: '#F4F4F4' },
    { brand: 'Travis Scott', name: 'Travis Scott Cactus Jack X Nike T-rexx Glow In The Dark Tee Black', productId: '6a30aafb33ebc7e910d2c980', img: 'https://aws-marcostorresalarcon-bucket.s3.us-east-2.amazonaws.com/products/11000042.jpeg', precio: 749, color: '#F0F4F8' },
  ];

  const items = customGallery?.length ? customGallery : defaultItems;
  const [productLinks, setProductLinks] = useState({});

  useEffect(() => {
    const links = {};
    Promise.all(
      items.map(async (item, i) => {
        if (item.productId) { links[i] = item.productId; return; }
        try {
          const res = await fetch(`${API_URL}/products?search=${encodeURIComponent(item.name)}&limit=1`);
          const data = await res.json();
          const match = data.products?.[0];
          if (match) links[i] = match._id;
        } catch {}
      })
    ).then(() => setProductLinks({ ...links }));
  }, [customGallery]);

  return (
    <div className="py-16 bg-white border-b border-gray-100 overflow-hidden">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-8 mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Populares Ahora</h2>
          <p className="text-sm text-gray-500 mt-1">Lo más buscado de la semana</p>
        </div>
        <a href="#shop" className="text-sm font-medium text-emerald-700 hover:text-emerald-800 transition-colors hidden sm:block">Ver catálogo completo →</a>
      </div>
      <div className="relative w-full flex items-stretch gap-4 overflow-x-auto no-scrollbar px-4 sm:px-8 pb-4 snap-x">
        {items.map((item, i) => {
          const productId = productLinks[i];
          const inner = (
            <div className="flex flex-col h-full">
              <div
                className={`h-[280px] sm:h-[320px] w-full rounded-xl overflow-hidden mb-4 relative flex-shrink-0 ${!item.color?.startsWith('#') ? item.color : ''}`}
                style={{ backgroundColor: item.color?.startsWith('#') ? item.color : undefined }}
              >
                <img src={item.img} alt={item.name} loading="lazy" decoding="async" className="w-full h-full object-contain p-4 mix-blend-multiply group-hover:scale-105 transition-transform duration-700" />
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">{item.brand}</p>
              <p className="text-sm font-medium text-gray-900 truncate group-hover:underline decoration-1 mb-1">{item.name}</p>
              {item.precio && <p className="text-sm font-mono text-gray-700">S/. {item.precio.toLocaleString()}</p>}
            </div>
          );
          return productId ? (
            <Link key={i} to={`/producto/${productId}`} className="min-w-[280px] sm:min-w-[320px] group snap-start">
              {inner}
            </Link>
          ) : (
            <div key={i} className="min-w-[280px] sm:min-w-[320px] group snap-start">
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Product Card ──────────────────────────────────────────────────────────────

const ProductCard = React.memo(({ product, onAddToCart }) => {
  const navigate = useNavigate();

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/producto/${product._id}`);
  };

  // Segunda imagen para el hover: 2a foto del color principal → 1a foto de otro color → galería
  const principalVar = product.variantes?.find(v => v.esPrincipal);
  const hoverImage = principalVar?.imagenes?.[1]
    || product.variantes?.find(v => !v.esPrincipal && v.imagenes?.length)?.imagenes?.[0]
    || product.galeria?.[0]
    || null;

  return (
    <div className="group relative bg-white transition-all duration-300 flex flex-col h-full animate-fade-in-up">
      <Link to={`/producto/${product._id}`} className="relative aspect-[4/5] bg-[#f8f9fa] overflow-hidden flex items-center justify-center p-6 block rounded-lg m-2 mb-0">
        {product.stock_actual <= 0 && (
          <span className="absolute top-4 right-4 bg-gray-100 text-gray-500 text-xs font-semibold px-2 py-1 rounded-sm z-10">AGOTADO</span>
        )}
        {product.tiene_oferta && (
          <div className="absolute top-4 left-4 z-10">
            <span className="bg-red-50 text-red-600 text-xs font-semibold px-2.5 py-1 rounded-full">OFERTA</span>
          </div>
        )}
        {isVideo(product.imagen_url) ? (
          <>
            <video src={product.imagen_url} autoPlay loop muted playsInline className={`absolute inset-0 h-full w-full object-contain p-6 mix-blend-multiply transition-all duration-700 ease-out z-10 ${hoverImage ? 'group-hover:opacity-0 group-hover:scale-95' : 'group-hover:scale-105'}`} />
            {hoverImage && <img src={hoverImage} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-contain p-6 mix-blend-multiply opacity-0 group-hover:opacity-100 transition-all duration-700 ease-out z-0 scale-105 group-hover:scale-100" />}
          </>
        ) : (
          <>
            <img src={product.imagen_url || 'https://via.placeholder.com/400?text=No+Image'} alt={product.nombre} loading="lazy" decoding="async" className={`absolute inset-0 h-full w-full object-contain p-6 mix-blend-multiply transition-all duration-700 ease-out z-10 ${hoverImage ? 'group-hover:opacity-0 group-hover:scale-95' : 'group-hover:scale-105'}`} />
            {hoverImage && <img src={hoverImage} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-contain p-6 mix-blend-multiply opacity-0 group-hover:opacity-100 transition-all duration-700 ease-out z-0 scale-105 group-hover:scale-100" />}
          </>
        )}
      </Link>
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">{product.marca || 'GENÉRICO'}</p>
          <Link to={`/producto/${product._id}`} className="text-sm font-medium leading-snug mb-2 text-gray-900 group-hover:underline decoration-1 line-clamp-2 block">{product.nombre}</Link>
        </div>
        <div className="mt-2 flex justify-between items-center">
          <div>
            <p className={`font-semibold ${product.tiene_oferta ? 'text-red-600' : 'text-gray-900'}`}>
              S/. {product.precio_min?.toLocaleString()}
            </p>
          </div>
          {product.stock_actual > 0 && (
            <button onClick={handleAdd} className="opacity-0 group-hover:opacity-100 transition-opacity bg-white p-2 rounded-full shadow-md text-gray-700 hover:text-black hover:bg-gray-50" title="Ver producto">
              <ShoppingCart size={18} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

// ── Checkout Modal ────────────────────────────────────────────────────────────

const STEP_LABELS = { cart: 'CARRITO', shipping: 'ENVÍO', payment: 'PAGO' };

const CheckoutStepIndicator = ({ step }) => (
  <div className="flex justify-between mb-8 px-4 relative">
    <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gray-200 -z-10"></div>
    {['cart', 'shipping', 'payment'].map((s) => {
      const isActive = step === s || step === 'success';
      const isPast = (['shipping', 'payment', 'success'].includes(step) && s === 'cart') || (['payment', 'success'].includes(step) && s === 'shipping');
      return (
        <div key={s} className={`flex flex-col items-center bg-white px-2 ${isActive || isPast ? 'text-black' : 'text-gray-400'}`}>
          <div className={`w-3 h-3 rounded-full border-2 ${isActive || isPast ? 'border-black bg-black' : 'border-gray-300 bg-white'} mb-2`}></div>
          <span className="text-[10px] uppercase font-semibold tracking-wider">{STEP_LABELS[s]}</span>
        </div>
      );
    })}
  </div>
);

const CheckoutModal = ({ isOpen, onClose, cart, total, onClearCart, onRemoveItem, whatsappNumber }) => {
  const [step, setStep] = useState('cart');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [shippingData, setShippingData] = useState({ nombre: '', direccion: '', telefono: '' });
  const [itemToRemove, setItemToRemove] = useState(null);

  useEffect(() => { if (isOpen) { setStep('cart'); setError(null); } }, [isOpen]);

  const handleNext = async () => {
    if (step === 'cart') return setStep('shipping');
    if (step === 'shipping') {
      if (!shippingData.nombre || !shippingData.direccion) { setError('Por favor completa los datos de envío'); return; }
      setError(null);
      return setStep('payment');
    }
    if (step === 'payment') {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/sales`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cart, total, cliente: shippingData }),
        });
        if (res.ok) {
          const productList = cart.map(item =>
            `* ${item.nombre}${item.talla ? ` T:${item.talla}` : ''}${item.color ? ` C:${item.color}` : ''} x${item.cantidad || 1} - ${formatPrice(item.precio * (item.cantidad || 1))}`
          ).join('%0A');
          const message = `Hola, soy *${shippingData.nombre}*. Quiero comprar:%0A%0A${productList}%0A%0A*TOTAL: ${formatPrice(total)}*%0A%0A_Enviado desde la tienda web._`;
          setTimeout(() => window.open(`https://wa.me/${whatsappNumber || '51921385472'}?text=${message}`, '_blank'), 1000);
          setStep('success');
          onClearCart();
        } else {
          const data = await res.json();
          setError(data.error || 'Error al procesar la orden');
        }
      } catch { setError('Ocurrió un error inesperado'); }
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-end sm:justify-center p-0 sm:p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white w-full sm:w-[500px] h-full sm:h-[85vh] relative flex flex-col shadow-2xl sm:rounded-xl overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white">
          <h2 className="text-lg font-semibold tracking-wide">{step === 'success' ? 'Orden Confirmada' : 'Tu Pedido'}</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-black rounded-full hover:bg-gray-50 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {step !== 'success' && <CheckoutStepIndicator step={step} />}

          {step === 'cart' && (
            <div className="space-y-6">
              {cart.length === 0 ? (
                <p className="text-center text-gray-500 py-10">Tu carrito está vacío.</p>
              ) : (
                cart.map((item) => (
                  <div key={item.cartId} className="flex gap-4 pb-4">
                    <div className="w-20 h-20 bg-gray-50 rounded-lg flex-shrink-0 flex items-center justify-center p-2">
                      <img src={item.imagen_url} className="w-full h-full object-contain mix-blend-multiply" alt="" />
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-sm leading-tight text-gray-900 pr-4">{item.nombre}</h4>
                        <button onClick={() => setItemToRemove(item.cartId)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                      </div>
                      {(item.talla || item.color) && (
                        <p className="text-[11px] text-gray-500 mt-0.5 uppercase tracking-wider">
                          {item.talla && `T: ${item.talla}`}{item.talla && item.color && ' · '}{item.color && `C: ${item.color}`}
                        </p>
                      )}
                      {item.sku && <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wider mt-0.5">{item.sku}</p>}
                      <div className="flex justify-between items-center mt-1">
                        {item.precio_original && item.precio < item.precio_original ? (
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm text-red-600">{formatPrice(item.precio)}</p>
                            <p className="text-[10px] text-gray-400 line-through">{formatPrice(item.precio_original)}</p>
                          </div>
                        ) : (
                          <p className="font-semibold text-sm text-gray-900">{formatPrice(item.precio)}</p>
                        )}
                        <span className="text-gray-500 text-xs font-medium">Cant: {item.cantidad || 1}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
              {cart.length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex justify-between font-semibold text-lg text-gray-900">
                    <span>Total</span><span>{formatPrice(total)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'shipping' && (
            <div className="space-y-5">
              <h3 className="font-semibold text-sm text-gray-900 flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-500" /> Dirección de Envío</h3>
              {error && <p className="text-red-500 text-xs font-medium bg-red-50 p-3 rounded-md">{error}</p>}
              <div className="space-y-4">
                {[['Nombre Completo', 'nombre'], ['Dirección', 'direccion'], ['Teléfono / WhatsApp', 'telefono']].map(([label, key]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                    <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-md focus:border-black focus:ring-1 focus:ring-black outline-none text-sm transition-all" value={shippingData[key]} onChange={e => setShippingData(prev => ({ ...prev, [key]: e.target.value }))} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'payment' && (
            <div className="space-y-6">
              {error && <p className="text-red-500 text-xs font-medium bg-red-50 p-3 rounded-md">{error}</p>}
              <div className="bg-gray-50 rounded-xl p-6 text-center border border-gray-100">
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total a Pagar</span>
                <div className="text-3xl font-semibold mt-1 text-gray-900">{formatPrice(total)}</div>
              </div>
              <label className="flex items-center gap-4 p-4 border border-black rounded-lg cursor-pointer bg-white shadow-sm">
                <CreditCard className="w-5 h-5 text-gray-700" />
                <div className="flex-1">
                  <div className="font-semibold text-sm text-gray-900">Acordar por WhatsApp</div>
                  <div className="text-xs text-gray-500 mt-0.5">Coordinaremos el pago de forma segura</div>
                </div>
                <div className="w-4 h-4 border-4 border-black rounded-full bg-white"></div>
              </label>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-green-600" strokeWidth={3} />
              </div>
              <h2 className="text-2xl font-semibold mb-3 text-gray-900">¡Orden Recibida!</h2>
              <p className="text-gray-500 text-sm mb-8 leading-relaxed px-4">Gracias por tu compra. Nos estaremos contactando en breve para procesar la entrega.</p>
              <button onClick={onClose} className="w-full bg-black text-white py-4 rounded-md font-medium hover:bg-gray-800 transition-colors">Volver a la Tienda</button>
            </div>
          )}
        </div>

        {step !== 'success' && (
          <div className="p-5 border-t border-gray-100 bg-white flex gap-3">
            {step !== 'cart' && (
              <button onClick={() => setStep(step === 'payment' ? 'shipping' : 'cart')} className="px-6 py-3.5 font-medium text-sm border border-gray-200 rounded-md hover:bg-gray-50 text-gray-700 transition-colors">Atrás</button>
            )}
            <button onClick={handleNext} disabled={cart.length === 0 || loading} className="flex-1 py-3.5 bg-black text-white font-medium text-sm rounded-md hover:bg-gray-800 disabled:opacity-50 flex justify-center items-center gap-2 transition-colors">
              {loading ? 'Procesando...' : step === 'payment' ? 'Confirmar Pedido' : 'Continuar'}
              {!loading && step !== 'payment' && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={itemToRemove !== null}
        title="Quitar Producto"
        message="¿Deseas quitar este producto de tu carrito?"
        confirmText="Eliminar"
        onConfirm={() => { onRemoveItem(itemToRemove); setItemToRemove(null); }}
        onCancel={() => setItemToRemove(null)}
      />
    </div>
  );
};

// ── Sidebar ───────────────────────────────────────────────────────────────────

const Sidebar = ({ isOpen, onClose, allCategories, allDesigners, selectedCategoryId, selectedSubcategoryId, selectedDesignerId, selectedBrand, brands, onSelectDesigner, onSelectCategory, onSelectSubcategory, onSelectBrand }) => {
  const [brandSearch, setBrandSearch] = useState('');
  const [expandedDesigners, setExpandedDesigners] = useState({});
  const [expandedCats, setExpandedCats] = useState({});
  const displayedBrands = brands.filter(b => b && b.toLowerCase().includes(brandSearch.toLowerCase()));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-80 max-w-[85vw] bg-white h-full border-r border-gray-100 flex flex-col shadow-2xl">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
          <img src="/logo juschiri.jpeg" alt="JUS CHIRI" className="h-6 object-contain" />
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-black hover:bg-gray-50 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Diseñadores */}
          {allDesigners.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[11px] text-gray-500 uppercase font-bold tracking-widest border-b border-gray-100 pb-2">DISEÑADORES</h3>
              <button
                onClick={() => { onSelectDesigner(null); onSelectCategory(null); onSelectSubcategory(null); onClose(); }}
                className={`block w-full text-left text-sm font-bold uppercase tracking-wide transition-colors py-1 ${!selectedDesignerId && !selectedCategoryId && !selectedBrand ? 'text-black' : 'text-gray-500 hover:text-black'}`}
              >
                VER TODO
              </button>
              {allDesigners.map(des => (
                <div key={des._id}>
                  <button
                    onClick={() => {
                      setExpandedDesigners(p => ({ ...p, [des._id]: !p[des._id] }));
                      onSelectDesigner(des._id);
                      onSelectCategory(null);
                      onSelectSubcategory(null);
                    }}
                    className={`flex items-center justify-between w-full text-left text-sm font-bold uppercase tracking-wide transition-colors py-1 ${selectedDesignerId === des._id ? 'text-black' : 'text-gray-500 hover:text-black'}`}
                  >
                    {des.name.toUpperCase()}
                    {des.categories?.length > 0 && <ChevronDown size={14} className={`transition-transform ${expandedDesigners[des._id] || selectedDesignerId === des._id ? 'rotate-180' : ''}`} />}
                  </button>
                  {(expandedDesigners[des._id] || selectedDesignerId === des._id) && des.categories?.length > 0 && (
                    <div className="pl-4 space-y-1 border-l-2 border-gray-100 ml-2 py-1">
                      {des.categories.map(cat => {
                        // Categoría global equivalente (para el ID de filtro y sus subcategorías globales)
                        const globalCat = allCategories.find(c => !c.designer && c.name === cat.name);
                        const gid = (globalCat?._id || cat._id)?.toString();
                        // Subcategorías propias del diseñador para esta categoría
                        const desSubs = cat.subcategories || [];
                        return (
                          <div key={cat._id}>
                            <button
                              onClick={() => { onSelectCategory(gid); onSelectSubcategory(null); setExpandedCats(p => ({ ...p, [cat._id]: !p[cat._id] })); }}
                              className={`flex items-center justify-between w-full text-left text-xs font-bold uppercase tracking-wider transition-colors py-1 ${selectedCategoryId === gid ? 'text-black' : 'text-gray-500 hover:text-black'}`}
                            >
                              {cat.name.toUpperCase()}
                              {desSubs.length > 0 && <ChevronDown size={12} className={`transition-transform ${expandedCats[cat._id] || selectedCategoryId === gid ? 'rotate-180' : ''}`} />}
                            </button>
                            {(expandedCats[cat._id] || selectedCategoryId === gid) && desSubs.length > 0 && (
                              <div className="pl-3 space-y-1 border-l border-gray-200 ml-1 py-1">
                                {desSubs.map(sub => {
                                  // Mapear al ID de la subcategoría global (mismo nombre) para que el filtro funcione
                                  const globalSub = globalCat?.subcategories?.find(s => s.name === sub.name);
                                  const subFilterId = (globalSub?._id || sub._id)?.toString();
                                  return (
                                    <button
                                      key={sub._id}
                                      onClick={() => { onSelectSubcategory(subFilterId); onClose(); }}
                                      className={`block w-full text-left text-[11px] font-semibold uppercase tracking-wider transition-colors py-0.5 ${selectedSubcategoryId === subFilterId ? 'text-black' : 'text-gray-400 hover:text-black'}`}
                                    >
                                      {sub.name.toUpperCase()}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Catálogo */}
          <div className="space-y-2">
            <h3 className="text-[11px] text-gray-500 uppercase font-bold tracking-widest border-b border-gray-100 pb-2">CATÁLOGO</h3>
            {allCategories.filter(cat => !cat.designer).map(cat => (
              <div key={cat._id}>
                <button
                  onClick={() => { onSelectCategory(cat._id); onSelectSubcategory(null); setExpandedCats(p => ({ ...p, [cat._id]: !p[cat._id] })); }}
                  className={`flex items-center justify-between w-full text-left text-sm font-bold uppercase tracking-wide transition-colors py-1 ${selectedCategoryId === cat._id ? 'text-black' : 'text-gray-500 hover:text-black'}`}
                >
                  {cat.name.toUpperCase()}
                  {cat.subcategories?.length > 0 && <ChevronDown size={14} className={`transition-transform ${expandedCats[cat._id] || selectedCategoryId === cat._id ? 'rotate-180' : ''}`} />}
                </button>
                {(expandedCats[cat._id] || selectedCategoryId === cat._id) && cat.subcategories?.length > 0 && (
                  <div className="pl-4 space-y-1 border-l-2 border-gray-100 ml-2 py-1">
                    {cat.subcategories.map(sub => (
                      <button
                        key={sub._id}
                        onClick={() => { onSelectSubcategory(sub._id); onClose(); }}
                        className={`block w-full text-left text-xs font-bold uppercase tracking-wider transition-colors py-0.5 ${selectedSubcategoryId === sub._id ? 'text-black' : 'text-gray-400 hover:text-black'}`}
                      >
                        {sub.name.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Marcas */}
          <div className="space-y-3 border-t border-gray-100 pt-6">
            <h3 className="text-[11px] text-gray-500 uppercase font-bold tracking-widest border-b border-gray-100 pb-2">MARCAS</h3>
            <input type="text" placeholder="Buscar marca..." value={brandSearch} onChange={e => setBrandSearch(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none focus:border-black transition-colors" />
            <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar pr-2">
              <button onClick={() => { onSelectBrand(null); onClose(); }} className={`block w-full text-left text-xs font-bold uppercase tracking-wider transition-colors py-0.5 ${!selectedBrand ? 'text-black' : 'text-gray-500 hover:text-black'}`}>TODAS LAS MARCAS</button>
              {displayedBrands.map(brand => (
                <button key={brand} onClick={() => { onSelectBrand(brand); onClose(); }} className={`block w-full text-left text-xs font-bold uppercase tracking-wider transition-colors py-0.5 ${selectedBrand === brand ? 'text-black' : 'text-gray-500 hover:text-black'}`}>{brand.toUpperCase()}</button>
              ))}
            </div>
          </div>

          {/* Portal admin */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-[11px] text-gray-500 uppercase font-bold tracking-widest mb-3">PORTAL</h3>
            <a href="/admin" className="text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-black hover:underline transition-colors">PANEL ADMIN</a>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Designer Slider ───────────────────────────────────────────────────────────

const DesignerSlider = ({ designers, selectedId, onSelect }) => {
  const [search, setSearch]       = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [hovered, setHovered]     = useState(false);
  const inputRef = useRef(null);

  const filtered = search
    ? designers.filter(d => d.name.toLowerCase().includes(search.toLowerCase()))
    : designers;

  const isSearching = searchOpen || search.length > 0;

  const pillClass = (id) =>
    `text-xs px-4 py-2 rounded-full border transition-all flex-shrink-0 font-bold uppercase tracking-wider whitespace-nowrap select-none ${
      selectedId === id
        ? 'bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)]'
        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-800 hover:text-black'
    }`;

  const pillSet = (prefix) => filtered.map((des, i) => (
    <button key={`${prefix}-${des._id}`} onClick={() => onSelect(des._id)} className={pillClass(des._id)}>
      {des.name.toUpperCase()}
    </button>
  ));

  const duration = `${Math.max(18, designers.length * 1.8)}s`;

  return (
    <div className="flex-1 flex items-center gap-2 min-w-0 overflow-hidden">
      {/* Search toggle button */}
      <button
        onClick={() => {
          const next = !searchOpen;
          setSearchOpen(next);
          if (next) setTimeout(() => inputRef.current?.focus(), 60);
          else setSearch('');
        }}
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-black hover:text-black transition-colors"
        aria-label="Buscar diseñador"
      >
        {searchOpen ? <X size={13} /> : <Search size={13} />}
      </button>

      {/* Search input (expand animation) */}
      <div className={`flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${searchOpen ? 'w-44 sm:w-56 opacity-100' : 'w-0 opacity-0'}`}>
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar diseñador..."
          className="w-full text-xs border border-gray-200 rounded-full px-4 py-2 outline-none focus:border-black font-medium placeholder:text-gray-400"
        />
      </div>

      {/* Pills strip */}
      {isSearching ? (
        /* Static filtered list when searching */
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
          {filtered.length > 0
            ? pillSet('s')
            : <span className="text-xs text-gray-400 italic whitespace-nowrap">Sin resultados</span>
          }
        </div>
      ) : (
        /* Animated marquee when idle */
        <div
          className="flex-1 overflow-hidden"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div
            className="flex gap-2 w-max animate-marquee py-0.5"
            style={{ animationDuration: duration, animationPlayState: hovered || selectedId ? 'paused' : 'running' }}
          >
            {pillSet('a')}
            {pillSet('b')}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Storefront ────────────────────────────────────────────────────────────────

export default function Storefront() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(24);
  const [allCategories, setAllCategories] = useState([]);
  const [allDesigners, setAllDesigners] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState(null);
  const [selectedDesignerId, setSelectedDesignerId] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [sortBy, setSortBy] = useState('featured');
  const observerRef = useRef(null);

  const cart = useCartStore(state => state.cart);
  const addToCartAction = useCartStore(state => state.addToCart);
  const removeFromCart = useCartStore(state => state.removeFromCart);
  const clearCart = useCartStore(state => state.clearCart);
  const cartTotal = cart.reduce((sum, item) => sum + (item.precio || 0) * (item.cantidad || 1), 0);

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });
  const [settings, setSettings] = useState({ whatsapp_number: '' });
  const [settingsReady, setSettingsReady] = useState(false);

  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'info' }), 3000);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, catRes, desRes, setRes] = await Promise.all([
          fetch(`${API_URL}/products?limit=2500`),
          fetch(`${API_URL}/categories`),
          fetch(`${API_URL}/categories/designers`),
          fetch(`${API_URL}/settings`),
        ]);
        const prodData = await prodRes.json();
        const catData = await catRes.json();
        const desData = await desRes.json();
        const setData = await setRes.json();
        setProducts(prodData.products || []);
        setAllCategories(catData || []);
        setAllDesigners(desData || []);
        setSettings(prev => ({ ...prev, ...setData }));
        setSettingsReady(true);
      } catch (err) {
        console.error('Error fetching data:', err);
        setSettingsReady(true);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleAddToCart = useCallback((product) => {
    addToCartAction(product);
    showNotification(`${product.nombre} agregado al carrito`, 'success');
  }, [addToCartAction, showNotification]);

  const availableBrands = useMemo(() => {
    return Array.from(new Set(products.map(p => p.marca).filter(Boolean))).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = products.filter(p => {
      if (!p.precio_min || p.precio_min <= 0) return false;
      if (selectedDesignerId) {
        const did = (p.designer?._id || p.designer)?.toString();
        if (did !== selectedDesignerId) return false;
      }
      if (selectedCategoryId) {
        const cid = (p.category?._id || p.category)?.toString();
        if (cid !== selectedCategoryId) return false;
      }
      if (selectedSubcategoryId) {
        const sid = (p.subcategory?._id || p.subcategory)?.toString();
        if (sid !== selectedSubcategoryId) return false;
      }
      if (selectedBrand && (!p.marca || p.marca.trim().toLowerCase() !== selectedBrand.trim().toLowerCase())) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!`${p.nombre || ''} ${p.marca || ''}`.toLowerCase().includes(q)) return false;
      }
      if (priceMin && p.precio_min < Number(priceMin)) return false;
      if (priceMax && p.precio_min > Number(priceMax)) return false;
      if (inStockOnly && p.stock_actual <= 0) return false;
      if (onSaleOnly && !p.tiene_oferta) return false;
      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'price_asc') return (a.precio_min || 0) - (b.precio_min || 0);
      if (sortBy === 'price_desc') return (b.precio_min || 0) - (a.precio_min || 0);
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      const stockA = a.stock_actual > 0 ? 1 : 0;
      const stockB = b.stock_actual > 0 ? 1 : 0;
      if (stockA !== stockB) return stockB - stockA;
      return 0;
    });

    return result;
  }, [products, selectedDesignerId, selectedCategoryId, selectedSubcategoryId, selectedBrand, searchQuery, priceMin, priceMax, inStockOnly, onSaleOnly, sortBy]);

  const lastElementRef = useCallback(node => {
    if (loading) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && displayLimit < filteredProducts.length) setDisplayLimit(p => p + 24);
    });
    if (node) observerRef.current.observe(node);
  }, [loading, displayLimit, filteredProducts.length]);

  useEffect(() => { setDisplayLimit(24); }, [selectedDesignerId, selectedCategoryId, selectedSubcategoryId, searchQuery, priceMin, priceMax, inStockOnly, onSaleOnly]);

  const clearAllFilters = () => {
    setPriceMin(''); setPriceMax(''); setInStockOnly(false); setOnSaleOnly(false);
    setSearchQuery(''); setSelectedDesignerId(null); setSelectedCategoryId(null);
    setSelectedSubcategoryId(null); setSelectedBrand(null); setSortBy('featured');
  };

  const activeCategory = (() => {
    const globalCat = allCategories.find(c => c._id?.toString() === selectedCategoryId);
    if (!globalCat) return null;
    // Cuando hay diseñador seleccionado, mostrar solo las subcategorías que ese diseñador tiene
    if (selectedDesignerId) {
      const selDes = allDesigners.find(d => d._id?.toString() === selectedDesignerId);
      const desCat = selDes?.categories?.find(c => c.name === globalCat.name);
      if (desCat?.subcategories?.length) {
        // Usar las subcategorías del diseñador pero con los IDs globales para que el filtro funcione
        const mappedSubs = desCat.subcategories.map(sub => {
          const globalSub = globalCat.subcategories?.find(s => s.name === sub.name);
          return { ...sub, _id: (globalSub?._id || sub._id)?.toString() };
        });
        return { ...globalCat, subcategories: mappedSubs };
      }
    }
    return globalCat;
  })();

  return (
    <div className="font-sans antialiased bg-white text-gray-900 selection:bg-neon-green min-h-screen flex flex-col">
      {notification.show && <Notification type={notification.type} message={notification.message} onClose={() => setNotification(n => ({ ...n, show: false }))} />}

      <Marquee text={settings.announcement_text} />
      <Navbar cartCount={cart.length} onOpenCart={() => setIsCheckoutOpen(true)} onOpenMenu={() => setIsSidebarOpen(true)} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        allCategories={allCategories}
        allDesigners={allDesigners}
        selectedDesignerId={selectedDesignerId}
        selectedCategoryId={selectedCategoryId}
        selectedSubcategoryId={selectedSubcategoryId}
        selectedBrand={selectedBrand}
        brands={availableBrands}
        onSelectDesigner={(id) => { setSelectedDesignerId(id); setSelectedCategoryId(null); setSelectedSubcategoryId(null); setSelectedBrand(null); document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' }); }}
        onSelectCategory={(id) => { setSelectedCategoryId(id); setSelectedSubcategoryId(null); setSelectedBrand(null); document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' }); }}
        onSelectSubcategory={(id) => { setSelectedSubcategoryId(id); document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' }); }}
        onSelectBrand={(brand) => { setSelectedBrand(brand); setSelectedDesignerId(null); setSelectedCategoryId(null); setSelectedSubcategoryId(null); document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' }); }}
      />

      <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} cart={cart} total={cartTotal} onClearCart={clearCart} onRemoveItem={removeFromCart} whatsappNumber={settings.whatsapp_number} />

      {settingsReady ? (
        <>
          <HeroSlider customSlides={settings.hero_slides} />
          <TrendingGallery customGallery={settings.trending_gallery} />
        </>
      ) : (
        <div className="h-[85vh] lg:h-[70vh] bg-gray-100 animate-pulse border-b border-gray-200" />
      )}

      <main id="shop" className="flex-1 w-full max-w-[1920px] mx-auto">
        {/* Barra de filtros sticky */}
        <div className="sticky top-20 sm:top-28 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 flex flex-col transition-all">

          {/* Fila 1: TODOS + OFERTAS | Diseñadores (search + marquee) | FILTROS */}
          <div className="flex items-center gap-3 px-4 sm:px-8 py-3 border-b border-gray-100/50">
            {/* Pills fijas */}
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={clearAllFilters}
                className={`text-xs px-5 py-2 rounded-full border transition-all flex-shrink-0 font-bold uppercase tracking-wider ${!selectedDesignerId && !selectedCategoryId && !selectedBrand && !onSaleOnly ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
              >
                TODOS
              </button>
              <button
                onClick={() => { setOnSaleOnly(!onSaleOnly); setSelectedDesignerId(null); setSelectedCategoryId(null); setSelectedSubcategoryId(null); setSelectedBrand(null); }}
                className={`text-xs px-5 py-2 rounded-full border transition-all flex-shrink-0 font-bold uppercase tracking-wider ${onSaleOnly ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
              >
                OFERTAS
              </button>
            </div>

            {/* Divisor */}
            <div className="w-px h-6 bg-gray-200 flex-shrink-0" />

            {/* Diseñadores: búsqueda + slide animado */}
            <DesignerSlider
              designers={allDesigners}
              selectedId={selectedDesignerId}
              onSelect={(id) => {
                if (selectedDesignerId === id) {
                  setSelectedDesignerId(null); setSelectedCategoryId(null); setSelectedSubcategoryId(null);
                } else {
                  setSelectedDesignerId(id); setSelectedCategoryId(null); setSelectedSubcategoryId(null); setSelectedBrand(null);
                  document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            />

            {/* FILTROS */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex-shrink-0 flex items-center justify-center gap-2 text-xs px-4 py-2 rounded-md border transition-colors font-bold uppercase tracking-wider ${showFilters ? 'bg-gray-100 border-gray-200 text-gray-900' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">FILTROS</span>
            </button>
          </div>

          {/* Fila 2: Categorías del diseñador seleccionado */}
          {(() => {
            const selDesigner = allDesigners.find(d => d._id === selectedDesignerId);
            return selDesigner?.categories?.length > 0 ? (
              <div className="bg-gray-50/50 border-b border-gray-100 flex gap-2 overflow-x-auto no-scrollbar px-4 sm:px-8 py-2.5">
                <button
                  onClick={() => { setSelectedCategoryId(null); setSelectedSubcategoryId(null); }}
                  className={`text-[11px] px-4 py-1.5 rounded-md transition-colors flex-shrink-0 font-bold uppercase tracking-wider ${!selectedCategoryId ? 'bg-black text-white' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  TODO
                </button>
                {selDesigner.categories.map(cat => {
                  const globalCat = allCategories.find(c => !c.designer && c.name === cat.name);
                  const gid = globalCat?._id || cat._id;
                  return (
                    <button
                      key={cat._id}
                      onClick={() => { setSelectedCategoryId(gid); setSelectedSubcategoryId(null); }}
                      className={`text-[11px] px-4 py-1.5 rounded-md transition-colors flex-shrink-0 font-bold uppercase tracking-wider ${selectedCategoryId === gid ? 'bg-black text-white' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                      {cat.name.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            ) : null;
          })()}

          {/* Fila 3: Subcategorías de la categoría seleccionada */}
          {activeCategory?.subcategories?.length > 0 && (
            <div className="bg-gray-50/30 border-b border-gray-100 flex gap-2 overflow-x-auto no-scrollbar px-4 sm:px-8 py-2.5">
              <button
                onClick={() => setSelectedSubcategoryId(null)}
                className={`text-[11px] px-4 py-1.5 rounded-md transition-colors flex-shrink-0 font-bold uppercase tracking-wider ${!selectedSubcategoryId ? 'bg-white shadow-sm border border-gray-200 text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
              >
                TODO {activeCategory.name.toUpperCase()}
              </button>
              {activeCategory.subcategories.map(sub => (
                <button
                  key={sub._id}
                  onClick={() => setSelectedSubcategoryId(sub._id)}
                  className={`text-[11px] px-4 py-1.5 rounded-md transition-colors flex-shrink-0 font-bold uppercase tracking-wider ${selectedSubcategoryId === sub._id ? 'bg-white shadow-sm border border-gray-200 text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  {sub.name.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          {/* Filtros avanzados */}
          {showFilters && (
            <div className="bg-gray-50 p-6 sm:px-8 animate-fade-in flex flex-wrap gap-6 items-center border-b border-gray-200 shadow-inner">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">MARCA:</span>
                <select className="bg-white border border-gray-200 rounded-md py-1.5 px-3 text-xs outline-none focus:border-black transition-colors font-bold uppercase" value={selectedBrand || ''} onChange={e => { setSelectedBrand(e.target.value || null); if (e.target.value) { setSelectedCategoryId(null); setSelectedSubcategoryId(null); } }}>
                  <option value="">TODAS</option>
                  {availableBrands.map(b => <option key={b} value={b}>{b.toUpperCase()}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">ORDEN:</span>
                <select className="bg-white border border-gray-200 rounded-md py-1.5 px-3 text-xs outline-none focus:border-black transition-colors" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="featured">DESTACADOS</option>
                  <option value="price_asc">PRECIO: MENOR A MAYOR</option>
                  <option value="price_desc">PRECIO: MAYOR A MENOR</option>
                  <option value="newest">LO MÁS NUEVO</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">PRECIO S/.</span>
                <input type="number" placeholder="Min" value={priceMin} onChange={e => setPriceMin(e.target.value)} className="w-20 p-1.5 border border-gray-200 rounded-md focus:border-black outline-none text-sm" />
                <span className="text-gray-400">—</span>
                <input type="number" placeholder="Max" value={priceMax} onChange={e => setPriceMax(e.target.value)} className="w-20 p-1.5 border border-gray-200 rounded-md focus:border-black outline-none text-sm" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-4 h-4 flex justify-center items-center border rounded-sm transition-colors ${inStockOnly ? 'bg-black border-black text-white' : 'bg-white border-gray-300 group-hover:border-black'}`}>
                  {inStockOnly && <Check className="w-3 h-3" strokeWidth={3} />}
                </div>
                <input type="checkbox" className="hidden" checked={inStockOnly} onChange={e => setInStockOnly(e.target.checked)} />
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">SOLO EN STOCK</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-4 h-4 flex justify-center items-center border rounded-sm transition-colors ${onSaleOnly ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-gray-300 group-hover:border-red-400'}`}>
                  {onSaleOnly && <Check className="w-3 h-3" strokeWidth={3} />}
                </div>
                <input type="checkbox" className="hidden" checked={onSaleOnly} onChange={e => setOnSaleOnly(e.target.checked)} />
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">SOLO OFERTAS</span>
              </label>
              {(priceMin || priceMax || inStockOnly || onSaleOnly || searchQuery || selectedDesignerId || selectedCategoryId || sortBy !== 'featured') && (
                <button onClick={clearAllFilters} className="text-xs font-bold text-gray-400 hover:text-black ml-auto transition-colors uppercase tracking-wider">LIMPIAR FILTROS</button>
              )}
            </div>
          )}
        </div>

        {onSaleOnly && (
          <div className="bg-red-50 text-red-600 p-6 sm:px-8 flex justify-between items-center border-b border-red-100 animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold tracking-tight uppercase">ZONA DE OFERTAS</h2>
              <p className="text-xs text-red-400 mt-1 uppercase tracking-widest font-medium">Descuentos exclusivos en piezas seleccionadas.</p>
            </div>
          </div>
        )}

        <div className="sm:hidden px-4 py-3 bg-white border-b border-gray-100 flex items-center">
          <Search className="w-5 h-5 text-gray-400" />
          <input type="text" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); if (e.target.value && window.scrollY < window.innerHeight * 0.5) document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' }); }} placeholder="Buscar por nombre o marca..." className="w-full bg-transparent border-none outline-none text-sm px-3 font-medium" />
          {searchQuery && <X className="w-5 h-5 text-gray-400 cursor-pointer hover:text-red-500" onClick={() => setSearchQuery('')} />}
        </div>

        <div className="p-4 sm:px-8 bg-gray-50/30">
          <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">
            MOSTRANDO {filteredProducts.length} PRODUCTO{filteredProducts.length !== 1 ? 'S' : ''}
          </p>
        </div>

        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            <div className="text-xs text-gray-500 font-medium tracking-widest uppercase">Cargando Catálogo...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 bg-gray-50/30">
            {filteredProducts.slice(0, displayLimit).map((product, index) => (
              <div
                key={product._id}
                ref={index === filteredProducts.slice(0, displayLimit).length - 1 ? lastElementRef : null}
                className="border-r border-b border-transparent z-0 hover:z-10"
              >
                <ProductCard product={product} onAddToCart={handleAddToCart} />
              </div>
            ))}
            {filteredProducts.length === 0 && (
              <div className="py-40 text-center col-span-full flex flex-col items-center gap-4">
                <Search className="w-12 h-12 text-gray-300" strokeWidth={1.5} />
                <p className="text-lg font-medium text-gray-500">No encontramos lo que buscas.</p>
                <button onClick={clearAllFilters} className="text-sm font-medium text-black hover:text-gray-600 transition-colors underline decoration-gray-300 underline-offset-4">VER TODO EL CATÁLOGO</button>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 py-12 mt-auto text-center">
        <div className="mb-6 flex justify-center">
          <img src="/logo juschiri.jpeg" alt="JUS CHIRI" className="h-6 opacity-80 mix-blend-multiply" />
        </div>
        <p className="text-xs text-gray-400 font-medium tracking-widest uppercase">
          Copyright © 2026 Jus Chiri International. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}
