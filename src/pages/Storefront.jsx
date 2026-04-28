import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, X, Menu, Search, Instagram, ArrowRight, Check, CreditCard, Truck, MapPin, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { Notification, ConfirmModal } from '../components/ui';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// --- UTILS ---
const formatPrice = (price) => `S/. ${(price || 0).toLocaleString('es-PE')}`;



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
  const [isBumping, setIsBumping] = useState(false);

  useEffect(() => {
      if (cartCount > 0) {
          setIsBumping(true);
          const timer = setTimeout(() => setIsBumping(false), 400);
          return () => clearTimeout(timer);
      }
  }, [cartCount]);

  const handleToggleSearch = () => {
      if (showSearch) {
          setSearchQuery('');
      }
      setShowSearch(!showSearch);
  };

  const handleSearchChange = (e) => {
      setSearchQuery(e.target.value);
      if (e.target.value) {
          // Si escribe, asegurar scroll a la tienda si está muy arriba
          if (window.scrollY < window.innerHeight * 0.5) {
              document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
          }
      }
  };

  return (
    <nav className="sticky top-9 z-50 bg-white border-b-2 border-black">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20 relative">
          <div className="flex items-center gap-6 w-1/3">
            <Menu className="w-8 h-8 cursor-pointer hover:opacity-50 transition-opacity" onClick={onOpenMenu} />
            <div className={`hidden sm:flex items-center transition-all overflow-hidden ${showSearch ? 'w-64 border-b-2 border-black' : 'w-6'}`}>
                <Search 
                    className={`w-6 h-6 cursor-pointer hover:opacity-50 flex-shrink-0 ${showSearch ? 'text-neon-green fill-black' : ''}`} 
                    onClick={handleToggleSearch}
                />
                <input 
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Buscar producto, marca..."
                    className={`ml-2 outline-none font-mono text-sm w-full bg-transparent transition-opacity duration-300 ${showSearch ? 'opacity-100' : 'opacity-0'}`}
                />
                {showSearch && searchQuery && (
                    <X className="w-4 h-4 cursor-pointer hover:text-red-500" onClick={() => setSearchQuery('')} />
                )}
            </div>
          </div>

          <div className="w-1/3 text-center flex justify-center">
              <h1 className="font-black text-3xl tracking-tighter uppercase italic cursor-pointer">JUS CHIRI®</h1>
          </div>

          <div className="flex items-center justify-end w-1/3 gap-6">
            <button 
              onClick={onOpenCart}
              className={`relative p-2 transition-all duration-300 border-2 rounded-none group ${
                  isBumping 
                  ? 'bg-neon-green text-black border-black scale-110 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-10' 
                  : 'hover:bg-black hover:text-white border-transparent hover:border-black'
              }`}
            >
              <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm hidden sm:block">CART [{cartCount}]</span>
                  <ShoppingBag className={`w-6 h-6 transition-transform ${isBumping ? '-rotate-12 scale-110' : ''}`} />
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

const ProductCard = React.memo(({ product, onAddToCart }) => {
  const navigate = useNavigate();
  const [isAdded, setIsAdded] = useState(false);
  const hasVariants = product.variantes && product.variantes.length > 0;

  const handleAdd = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (hasVariants) {
          navigate(`/producto/${product.codigo}`);
          return;
      }
      const finalPrice = product.descuento > 0 ? product.precio * (1 - product.descuento / 100) : product.precio;
      onAddToCart({ ...product, precio: finalPrice, precio_original: product.precio });
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 1000);
  };

  return (
  <div className="group relative bg-white border-2 border-transparent hover:border-black transition-all duration-300 flex flex-col h-full animate-fade-in-up">
    <Link to={`/producto/${product.codigo}`} className="relative aspect-[4/5] bg-gray-50 overflow-hidden border-b-2 border-gray-100 group-hover:border-black transition-colors flex items-center justify-center p-4 block">
      {product.stock_actual <= 0 && (
        <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-3 py-1 uppercase border-l-2 border-b-2 border-black z-10">
          Agotado
        </span>
      )}
      {product.descuento > 0 && (
        <div className="absolute top-3 left-3 z-10">
            <span className="bg-red-600 text-white text-xs font-black px-3 py-1.5 uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-black transform -rotate-2 inline-block hover:rotate-0 transition-transform">
                -{product.descuento}% OFF
            </span>
        </div>
      )}
      <img
        src={product.imagen_url || 'https://via.placeholder.com/400?text=No+Image'}
        alt={product.nombre}
        loading="lazy"
        className="h-full w-full object-contain group-hover:scale-110 transition-transform duration-700 ease-in-out mix-blend-multiply"
      />
      <div className={`absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px] transition-all duration-300 ${isAdded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        {product.stock_actual > 0 ? (
          <button
            onClick={handleAdd}
            className={`font-bold uppercase text-sm px-6 py-3 border-2 border-black transform transition-all duration-300 shadow-xl ${
                isAdded 
                ? 'bg-neon-green text-black translate-y-0 scale-105 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' 
                : 'bg-white text-black hover:bg-neon-green translate-y-4 group-hover:translate-y-0'
            }`}
          >
            {isAdded ? 'Agregado ✓' : 'Agregar al Carrito'}
          </button>
        ) : (
          <button className="bg-gray-200 text-gray-500 font-bold uppercase text-sm px-6 py-3 border-2 border-black cursor-not-allowed">
            Sin Stock
          </button>
        )}
      </div>
    </Link>
    <div className="p-4 flex-1 flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-2">
            <p className="font-mono text-xs text-gray-500 uppercase">{product.codigo}</p>
            <p className="font-bold text-sm uppercase tracking-wide">{product.marca}</p>
        </div>
        <Link to={`/producto/${product.codigo}`} className="text-sm sm:text-base font-black uppercase leading-tight mb-2 hover:underline decoration-2 line-clamp-2 block">
            {product.nombre}
        </Link>
      </div>
      <div className="mt-4 pt-4 border-t-2 border-gray-100 group-hover:border-black transition-colors flex justify-between items-center">
        <div className="flex flex-col">
            {product.descuento > 0 ? (
                <div className="flex items-center gap-2">
                    <p className="font-mono font-black text-xl text-red-600">{formatPrice(product.precio * (1 - product.descuento / 100))}</p>
                    <p className="font-mono text-xs text-gray-400 line-through decoration-red-400/50 decoration-2">{formatPrice(product.precio)}</p>
                </div>
            ) : (
                <p className="font-mono font-bold text-lg leading-none">{formatPrice(product.precio)}</p>
            )}
        </div>
      </div>
    </div>
  </div>
  );
});

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

const CheckoutModal = ({ isOpen, onClose, cart, total, onClearCart, onRemoveItem, whatsappNumber }) => {
    const [step, setStep] = useState('cart');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [shippingData, setShippingData] = useState({
        nombre: '',
        direccion: '',
        telefono: ''
    });
    const [itemToRemove, setItemToRemove] = useState(null);

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
                    // Generar mensaje de WhatsApp
                    const productList = cart.map(item => 
                        `* ${item.nombre} (Cod: ${item.codigo}) x${item.cantidad || 1} - ${formatPrice(item.precio * (item.cantidad || 1))}`
                    ).join('%0A');
                    
                    const message = `Hola, mi nombre es *${shippingData.nombre}*. Quiero comprar estos productos:%0A%0A${productList}%0A%0A*TOTAL: ${formatPrice(total)}*%0A%0A_Enviado desde la tienda web._`;
                    
                    const whatsappUrl = `https://wa.me/${whatsappNumber || '51921385472'}?text=${message}`;
                    
                    // Pequeño delay para que el usuario vea el cambio de estado antes de la redirección
                    setTimeout(() => {
                        window.open(whatsappUrl, '_blank');
                    }, 1000);

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
                                cart.map((item) => (
                                    <div key={item.codigo} className="flex gap-4 border-b border-gray-100 pb-4">
                                        <div className="w-20 h-20 bg-gray-100 flex-shrink-0 border border-gray-200">
                                            <img src={item.imagen_url} className="w-full h-full object-contain p-1 mix-blend-multiply" alt="" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-sm uppercase">{item.nombre}</h4>
                                                <button 
                                                    onClick={() => setItemToRemove(item.codigo)}
                                                    className="p-1 px-2 text-gray-300 hover:text-red-500 transition-colors"
                                                    title="Eliminar producto"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            <p className="text-xs font-mono text-gray-500 mb-2">{item.codigo}</p>
                                            <div className="flex justify-between items-center">
                                                <div className="flex flex-col">
                                                    {item.descuento > 0 ? (
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-bold text-sm text-red-600">{formatPrice(item.precio)}</p>
                                                            <p className="text-[10px] text-gray-400 line-through">{formatPrice(item.precio_original)}</p>
                                                        </div>
                                                    ) : (
                                                        <p className="font-bold text-sm">{formatPrice(item.precio)}</p>
                                                    )}
                                                </div>
                                                <div className="bg-black text-white px-2 py-0.5 text-[10px] font-black uppercase">
                                                    CANT: {item.cantidad || 1}
                                                </div>
                                            </div>
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

            <ConfirmModal 
                isOpen={itemToRemove !== null}
                title="Quitar Producto"
                message="¿Estás seguro de que deseas quitar este producto de tu carrito?"
                confirmText="Eliminar"
                onConfirm={() => {
                    onRemoveItem(itemToRemove);
                    setItemToRemove(null);
                }}
                onCancel={() => setItemToRemove(null)}
            />
        </div>
    );
};

const Sidebar = ({ isOpen, onClose, selectedCategoryId, onSelectCategory, allCategories, selectedTypeId, onSelectType, selectedSubcategoryId, onSelectSubcategory, brands, selectedBrand, onSelectBrand }) => {
    const [brandSearch, setBrandSearch] = useState('');
    const displayedBrands = brands.filter(b => b && b.toLowerCase().includes(brandSearch.toLowerCase()));

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
                        <h3 className="font-mono text-xs text-gray-500 uppercase font-bold tracking-widest border-b border-gray-200 pb-2">Catálogo</h3>
                        <button
                            onClick={() => { onSelectCategory(null); onSelectType(null); onSelectSubcategory(null); onClose(); }}
                            className={`block w-full text-left font-black text-2xl uppercase tracking-tighter hover:text-neon-green transition-colors ${!selectedCategoryId && !selectedBrand ? 'text-black underline' : 'text-gray-400'}`}
                        >
                            Todos
                        </button>
                        {allCategories.map(cat => (
                            <div key={cat._id} className="space-y-2">
                                <button
                                    onClick={() => { onSelectCategory(cat._id); onSelectType(null); onSelectSubcategory(null); }}
                                    className={`block w-full text-left font-black text-xl uppercase tracking-tighter hover:text-neon-green transition-colors ${selectedCategoryId === cat._id ? 'text-black underline' : 'text-gray-400'}`}
                                >
                                    {cat.name}
                                </button>
                                {selectedCategoryId === cat._id && cat.types && cat.types.length > 0 && (
                                    <div className="pl-4 space-y-3 border-l-2 border-neon-green ml-2 py-2">
                                        {cat.types.map(type => (
                                            <div key={type._id} className="space-y-2">
                                                <button
                                                    onClick={() => { onSelectType(type._id); onSelectSubcategory(null); }}
                                                    className={`block w-full text-left font-bold text-md uppercase tracking-wide hover:text-black transition-colors ${selectedTypeId === type._id ? 'text-black underline' : 'text-gray-400'}`}
                                                >
                                                    {type.name}
                                                </button>
                                                {selectedTypeId === type._id && type.subcategories && type.subcategories.length > 0 && (
                                                    <div className="pl-4 space-y-2 border-l border-gray-300 ml-1 py-1">
                                                        <button 
                                                            onClick={() => { onSelectSubcategory(null); onClose(); }}
                                                            className={`block w-full text-left font-mono text-xs uppercase tracking-wide hover:text-black transition-colors ${!selectedSubcategoryId ? 'text-black font-bold' : 'text-gray-400'}`}
                                                        >
                                                            Todo {type.name}
                                                        </button>
                                                        {type.subcategories.map(sub => (
                                                            <button 
                                                                key={sub._id}
                                                                onClick={() => { onSelectSubcategory(sub._id); onClose(); }}
                                                                className={`block w-full text-left font-mono text-xs uppercase tracking-wide hover:text-black transition-colors ${selectedSubcategoryId === sub._id ? 'text-black font-bold underline' : 'text-gray-400'}`}
                                                            >
                                                                {sub.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="border-t-2 border-gray-100 pt-6 space-y-4">
                        <div className="flex flex-col gap-2 border-b border-gray-200 pb-2">
                            <h3 className="font-mono text-xs text-gray-500 uppercase font-bold tracking-widest">Marcas</h3>
                            <input 
                                type="text"
                                placeholder="Buscar marca..."
                                value={brandSearch}
                                onChange={(e) => setBrandSearch(e.target.value)}
                                className="w-full px-2 py-1 text-sm border-2 border-gray-200 focus:border-black outline-none font-mono uppercase"
                            />
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar pr-2">
                            <button
                                onClick={() => { onSelectBrand(null); onClose(); }}
                                className={`block w-full text-left font-mono text-sm uppercase tracking-wide hover:text-black transition-colors ${!selectedBrand ? 'text-black font-bold underline' : 'text-gray-400'}`}
                            >
                                Todas las marcas
                            </button>
                            {displayedBrands.map(brand => (
                                <button
                                    key={brand}
                                    onClick={() => { onSelectBrand(brand); onClose(); }}
                                    className={`block w-full text-left font-mono text-sm uppercase tracking-wide hover:text-black transition-colors ${selectedBrand === brand ? 'text-black font-bold underline' : 'text-gray-400'}`}
                                >
                                    {brand}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="border-t-2 border-gray-100 pt-6 space-y-4">
                        <h3 className="font-mono text-xs text-gray-500 uppercase font-bold tracking-widest">Portal</h3>
                        <a href="/admin" className="flex items-center gap-2 text-sm font-bold uppercase hover:underline">
                            Panel Técnico / Admin
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default function Storefront() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(24);
  const [allCategories, setAllCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedTypeId, setSelectedTypeId] = useState(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState(null);
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

  const showNotification = useCallback((message, type = 'info') => {
      setNotification({ show: true, message, type });
      setTimeout(() => setNotification({ show: false, message: '', type: 'info' }), 3000);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, catRes, setRes] = await Promise.all([
          fetch(`${API_URL}/products?limit=2500`),
          fetch(`${API_URL}/categories`),
          fetch(`${API_URL}/settings`)
        ]);
        
        const prodData = await prodRes.json();
        const catData = await catRes.json();
        const setData = await setRes.json();
        
        setProducts(prodData.products || []);
        setAllCategories(catData || []);
        setSettings(prev => ({ ...prev, ...setData }));
      } catch (err) {
        console.error("Error fetching data:", err);
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
    const brands = new Set(products.map(p => p.marca).filter(Boolean));
    return Array.from(brands).sort();
  }, [products]);

  // FILTER LOGIC - Memoized for performance
  const filteredProducts = useMemo(() => {
    let result = products.filter(p => {
      if (p.precio <= 0) return false;
      if (selectedCategoryId && p.category?._id !== selectedCategoryId) return false;
      if (selectedTypeId && p.type?._id !== selectedTypeId) return false;
      if (selectedSubcategoryId && p.subcategory?._id !== selectedSubcategoryId) return false;
      if (selectedBrand && (!p.marca || p.marca.trim().toLowerCase() !== selectedBrand.trim().toLowerCase())) return false;
      if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const textToSearch = `${p.nombre || ''} ${p.marca || ''} ${p.codigo || ''}`.toLowerCase();
          if (!textToSearch.includes(q)) return false;
      }
      const pFinal = p.descuento > 0 ? p.precio * (1 - p.descuento / 100) : p.precio;
      if (priceMin && pFinal < Number(priceMin)) return false;
      if (priceMax && pFinal > Number(priceMax)) return false;
      if (inStockOnly && p.stock_actual <= 0) return false;
      if (onSaleOnly && (!p.descuento || p.descuento <= 0)) return false;
      return true;
    });

    // Sorteo
    result.sort((a, b) => {
      const pFinalA = a.descuento > 0 ? a.precio * (1 - a.descuento / 100) : a.precio;
      const pFinalB = b.descuento > 0 ? b.precio * (1 - b.descuento / 100) : b.precio;
      if (sortBy === 'price_asc') return pFinalA - pFinalB;
      if (sortBy === 'price_desc') return pFinalB - pFinalA;
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      
      // Default / Featured: Stock + Image + Price
      const stockA = a.stock_actual > 0 ? 1 : 0;
      const stockB = b.stock_actual > 0 ? 1 : 0;
      if (stockA !== stockB) return stockB - stockA;

      const imgA = (a.imagen_url && !a.imagen_url.includes('placeholder')) ? 1 : 0;
      const imgB = (b.imagen_url && !b.imagen_url.includes('placeholder')) ? 1 : 0;
      if (imgA !== imgB) return imgB - imgA;

      return 0;
    });

    return result;
  }, [products, selectedCategoryId, selectedTypeId, selectedSubcategoryId, selectedBrand, searchQuery, priceMin, priceMax, inStockOnly, onSaleOnly, sortBy]);


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
  }, [selectedCategoryId, selectedSubcategoryId, searchQuery, priceMin, priceMax, inStockOnly, onSaleOnly]);

  return (
    <div className="font-sans antialiased bg-white text-gray-900 selection:bg-neon-green min-h-screen flex flex-col">
      {notification.show && (
          <Notification 
            type={notification.type} 
            message={notification.message} 
            onClose={() => setNotification({ ...notification, show: false })} 
          />
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
        allCategories={allCategories}
        selectedCategoryId={selectedCategoryId}
        selectedTypeId={selectedTypeId}
        selectedSubcategoryId={selectedSubcategoryId}
        brands={availableBrands}
        selectedBrand={selectedBrand}
        onSelectBrand={(brand) => {
            setSelectedBrand(brand);
            setSelectedCategoryId(null);
            setSelectedTypeId(null);
            setSelectedSubcategoryId(null);
            document.getElementById('shop').scrollIntoView({ behavior: 'smooth' });
        }}
        onSelectType={(id) => {
             setSelectedTypeId(id);
             setSelectedSubcategoryId(null);
             setSelectedBrand(null);
        }}
        onSelectCategory={(id) => {
            setSelectedCategoryId(id);
            setSelectedTypeId(null);
            setSelectedSubcategoryId(null);
            setSelectedBrand(null);
            // El click en categoría no hace scroll ni cierra, solo abre acordeón si hay subcategorías
            if (!id || allCategories.find(c => c._id === id)?.types?.length === 0) {
                 document.getElementById('shop').scrollIntoView({ behavior: 'smooth' });
                 setIsSidebarOpen(false);
            }
        }}
        onSelectSubcategory={(id) => {
            setSelectedSubcategoryId(id);
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
        whatsappNumber={settings.whatsapp_number}
      />

      <Hero />

      <main id="shop" className="flex-1 w-full max-w-[1920px] mx-auto">
        {/* Nav sticky (Pills & Filtros Toggle) */}
        <div className="sticky top-20 sm:top-28 z-40 bg-white/95 backdrop-blur-md border-b-2 border-black flex flex-col transition-all">
            <div className="flex justify-between items-center p-3 sm:p-4 sm:px-8 gap-2 sm:gap-4 border-b border-gray-100/50">
                
                {/* Categorías Principales y Filtros Activos */}
                <div className="flex gap-2 sm:gap-3 overflow-x-auto no-scrollbar w-full py-1">
                    <button
                        onClick={() => { setSelectedCategoryId(null); setSelectedTypeId(null); setSelectedSubcategoryId(null); setSelectedBrand(null); setOnSaleOnly(false); }}
                        className={`font-mono text-xs sm:text-sm shadow-sm uppercase px-4 sm:px-5 py-2 border-2 transition-all flex-shrink-0 ${
                            !selectedCategoryId && !selectedBrand && !onSaleOnly
                            ? 'bg-black text-white border-black font-bold shadow-[3px_3px_0px_0px_rgba(204,255,0,1)] -translate-y-0.5' 
                            : 'bg-white text-gray-500 border-gray-200 hover:border-black hover:text-black hover:-translate-y-0.5'
                        }`}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => { setOnSaleOnly(!onSaleOnly); setSelectedCategoryId(null); setSelectedTypeId(null); setSelectedSubcategoryId(null); setSelectedBrand(null); }}
                        className={`font-mono text-xs sm:text-sm shadow-sm uppercase px-4 sm:px-5 py-2 border-2 transition-all flex-shrink-0 ${
                            onSaleOnly
                            ? 'bg-red-600 text-white border-black font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5' 
                            : 'bg-white text-red-500 border-red-200 hover:border-red-600 hover:text-red-600 hover:-translate-y-0.5'
                        }`}
                    >
                        % Ofertas
                    </button>
                    {selectedBrand && (
                        <button
                            onClick={() => setSelectedBrand(null)}
                            className="font-mono text-xs sm:text-sm shadow-sm uppercase px-4 sm:px-5 py-2 border-2 transition-all flex-shrink-0 bg-neon-green text-black border-black font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5 flex items-center gap-2 group"
                            title="Quitar filtro de marca"
                        >
                            Marca: {selectedBrand}
                            <X className="w-3 h-3 sm:w-4 sm:h-4 group-hover:scale-125 transition-transform" />
                        </button>
                    )}
                    {allCategories.map((cat) => (
                        <button
                            key={cat._id}
                            onClick={() => { setSelectedCategoryId(cat._id); setSelectedTypeId(null); setSelectedSubcategoryId(null); setSelectedBrand(null); }}
                            className={`font-mono text-xs sm:text-sm shadow-sm uppercase px-4 sm:px-5 py-2 border-2 transition-all flex-shrink-0 ${
                                selectedCategoryId === cat._id
                                ? 'bg-black text-white border-black font-bold shadow-[3px_3px_0px_0px_rgba(204,255,0,1)] -translate-y-0.5' 
                                : 'bg-white text-gray-500 border-gray-200 hover:border-black hover:text-black hover:-translate-y-0.5'
                            }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* Botón Switch Filtros */}
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex-shrink-0 flex items-center justify-center gap-2 font-mono font-bold text-sm uppercase px-3 sm:px-4 py-2 border-2 transition-colors ${showFilters ? 'bg-neon-green border-black text-black' : 'bg-white border-gray-200 text-gray-600 hover:border-black hover:text-black'}`}
                  title="Filtros"
                >
                  <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Filtros</span>
                </button>
            </div>

            {/* Tipos y Subcategorías Secundarias (Si hay categoría activa) */}
            {selectedCategoryId && allCategories.find(c => c._id === selectedCategoryId)?.types?.length > 0 && (
                <div className="bg-gray-50/90 border-b border-gray-200 flex flex-col w-full shadow-inner">
                    {/* Fila de Tipos */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 sm:px-8 py-2 border-b border-gray-100">
                        <button
                            onClick={() => { setSelectedTypeId(null); setSelectedSubcategoryId(null); }}
                            className={`font-mono text-[10px] sm:text-xs uppercase px-4 py-1.5 border-2 transition-all flex-shrink-0 rounded-full ${
                                !selectedTypeId
                                ? 'bg-black text-white border-black font-bold shadow-[2px_2px_0px_0px_rgba(204,255,0,1)]' 
                                : 'bg-white text-gray-500 border-gray-200 hover:border-black hover:text-black'
                            }`}
                        >
                            Ver Todo
                        </button>
                        {allCategories.find(c => c._id === selectedCategoryId).types.map((type) => (
                            <button
                                key={type._id}
                                onClick={() => { setSelectedTypeId(type._id); setSelectedSubcategoryId(null); }}
                                className={`font-mono text-[10px] sm:text-xs uppercase px-4 py-1.5 border-2 transition-all flex-shrink-0 rounded-full ${
                                    selectedTypeId === type._id
                                    ? 'bg-black text-white border-black font-bold shadow-[2px_2px_0px_0px_rgba(204,255,0,1)]' 
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-black hover:text-black'
                                }`}
                            >
                                {type.name}
                            </button>
                        ))}
                    </div>

                    {/* Fila de Subcategorías si hay un tipo seleccionado */}
                    {selectedTypeId && allCategories.find(c => c._id === selectedCategoryId)?.types?.find(t => t._id === selectedTypeId)?.subcategories?.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 sm:px-8 py-2 bg-gray-100/50">
                            <button
                                onClick={() => setSelectedSubcategoryId(null)}
                                className={`font-mono text-[10px] sm:text-xs uppercase px-4 py-1 border transition-all flex-shrink-0 ${
                                    !selectedSubcategoryId
                                    ? 'bg-black text-white border-black font-bold' 
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-black hover:text-black'
                                }`}
                            >
                                Todas las subcategorías
                            </button>
                            {allCategories.find(c => c._id === selectedCategoryId).types.find(t => t._id === selectedTypeId).subcategories.map((sub) => (
                                <button
                                    key={sub._id}
                                    onClick={() => setSelectedSubcategoryId(sub._id)}
                                    className={`font-mono text-[10px] sm:text-xs uppercase px-4 py-1 border transition-all flex-shrink-0 ${
                                        selectedSubcategoryId === sub._id
                                        ? 'bg-black text-white border-black font-bold' 
                                        : 'bg-white text-gray-500 border-gray-200 hover:border-black hover:text-black'
                                    }`}
                                >
                                    {sub.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Panel de Filtros Expandible */}
            {showFilters && (
                <div className="border-t-2 border-black bg-gray-50 p-4 sm:px-8 animate-fade-in flex flex-wrap gap-6 items-center">
                    {/* Subcategorías dinámicas si hay categoría seleccionada */}
                    {selectedCategoryId && allCategories.find(c => c._id === selectedCategoryId)?.subcategories?.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-xs uppercase font-bold text-gray-500">Sub:</span>
                            <select 
                                className="bg-white border-2 border-gray-200 p-2 font-mono text-xs uppercase outline-none focus:border-black"
                                value={selectedSubcategoryId || ""}
                                onChange={(e) => setSelectedSubcategoryId(e.target.value || null)}
                            >
                                <option value="">Todas</option>
                                {allCategories.find(c => c._id === selectedCategoryId).subcategories.map(sub => (
                                    <option key={sub._id} value={sub._id}>{sub.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Selección de Marca en Filtros Rápidos */}
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-xs uppercase font-bold text-gray-500">Marca:</span>
                        <select 
                            className="bg-white border-2 border-gray-200 p-2 font-mono text-xs uppercase outline-none focus:border-black"
                            value={selectedBrand || ""}
                            onChange={(e) => {
                                const brand = e.target.value || null;
                                setSelectedBrand(brand);
                                if (brand) {
                                    setSelectedCategoryId(null);
                                    setSelectedTypeId(null);
                                    setSelectedSubcategoryId(null);
                                }
                            }}
                        >
                            <option value="">Todas</option>
                            {availableBrands.map(brand => (
                                <option key={brand} value={brand}>{brand}</option>
                            ))}
                        </select>
                    </div>

                    {/* Ordenamiento */}
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-xs uppercase font-bold text-gray-500">Orden:</span>
                        <select 
                            className="bg-white border-2 border-gray-200 p-2 font-mono text-xs uppercase outline-none focus:border-black"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="featured">Destacados</option>
                            <option value="price_asc">Precio: Menor a Mayor</option>
                            <option value="price_desc">Precio: Mayor a Menor</option>
                            <option value="newest">Lo más nuevo</option>
                        </select>
                    </div>

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

                    <label className="flex items-center gap-2 cursor-pointer group">
                        <div className={`w-5 h-5 flex justify-center items-center border-2 transition-colors ${onSaleOnly ? 'bg-red-600 border-black text-white' : 'bg-white border-gray-300 group-hover:border-black'}`}>
                            {onSaleOnly && <Check className="w-4 h-4" strokeWidth={4} />}
                        </div>
                        <input 
                            type="checkbox" 
                            className="hidden" 
                            checked={onSaleOnly}
                            onChange={(e) => setOnSaleOnly(e.target.checked)}
                        />
                        <span className="font-mono text-sm uppercase font-bold text-red-600">Solo Ofertas</span>
                    </label>

                    {(priceMin || priceMax || inStockOnly || onSaleOnly || searchQuery || selectedCategoryId || sortBy !== 'featured') && (
                         <button 
                            onClick={() => { 
                                setPriceMin(''); 
                                setPriceMax(''); 
                                setInStockOnly(false); 
                                setOnSaleOnly(false);
                                setSearchQuery(''); 
                                setSelectedCategoryId(null);
                                setSelectedSubcategoryId(null);
                                setSelectedBrand(null);
                                setSortBy('featured');
                            }}
                            className="text-xs font-mono font-bold text-gray-500 underline hover:text-black ml-auto"
                         >
                             Limpiar Filtros
                         </button>
                    )}
                </div>
            )}

        </div>

        {/* Banner de Ofertas si el filtro está activo */}
        {onSaleOnly && (
            <div className="bg-red-600 text-white p-6 sm:px-8 flex justify-between items-center border-b-2 border-black animate-fade-in">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter italic">ZONA DE OFFERS</h2>
                    <p className="font-mono text-[10px] sm:text-xs uppercase opacity-80 tracking-widest">Aprovecha los descuentos exclusivos en piezas seleccionadas.</p>
                </div>
                <div className="text-5xl font-black opacity-10 hidden lg:block italic tracking-tighter">SALE SALE SALE</div>
            </div>
        )}

        {/* Búsqueda en Móviles (Opcional, pero cubierto por la barra) */}
        <div className="sm:hidden px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center">
            <Search className="w-5 h-5 text-gray-400" />
            <input 
                type="text"
                value={searchQuery}
                onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value && window.scrollY < window.innerHeight * 0.5) {
                        document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
                    }
                }}
                placeholder="Buscar por nombre o código..."
                className="w-full bg-transparent border-none outline-none font-mono text-sm px-3"
            />
            {searchQuery && (
                <X className="w-5 h-5 text-gray-400 cursor-pointer hover:text-red-500" onClick={() => setSearchQuery('')} />
            )}
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
          Copyright © 2026 Jus Chiri International. All rights reserved.
      </footer>
    </div>
  );
}