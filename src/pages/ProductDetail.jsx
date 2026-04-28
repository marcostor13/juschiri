import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShoppingCart, ArrowLeft, Loader2, Image as ImageIcon } from 'lucide-react';
import { useCartStore } from '../store/cartStore';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const isVideo = (url) => url && url.match(/\.(mp4|webm|ogg|mov)$/i);

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState('');
  
  // Variantes
  const [selectedTalla, setSelectedTalla] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  
  const addToCartAction = useCartStore(state => state.addToCart);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/products?limit=2500`);
        const data = await res.json();
        const allProducts = data.products || [];
        
        const found = allProducts.find(p => p._id === id || p.codigo === id);
        if (found) {
            setProduct(found);
            setSelectedImage(found.imagen_url || '');
            
            // Relacionados: misma subcategoría o marca, excluyendo el actual, max 4
            const rel = allProducts.filter(p => 
                p._id !== found._id && 
                (p.subcategory === found.subcategory || p.marca === found.marca)
            ).slice(0, 4);
            setRelated(rel);
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    
    // reset state
    setSelectedTalla('');
    setSelectedColor('');
    fetchProduct();
    window.scrollTo(0,0);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin w-8 h-8 text-gray-400" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
        <h1 className="text-2xl font-semibold mb-6">Producto no encontrado</h1>
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-black text-white font-medium hover:bg-gray-800 transition-colors rounded-md">Volver a la Tienda</button>
      </div>
    );
  }

  const galeria = [product.imagen_url, ...(product.galeria || [])].filter(Boolean);
  const hasVariants = product.variantes && product.variantes.length > 0;
  
  // Extraer tallas y colores únicos
  const tallas = hasVariants ? [...new Set(product.variantes.map(v => v.talla).filter(Boolean))] : [];
  const colores = hasVariants ? [...new Set(product.variantes.map(v => v.color).filter(Boolean))] : [];

  const handleAddToCart = () => {
      if (hasVariants) {
          if (tallas.length > 0 && !selectedTalla) return alert("Por favor selecciona una talla");
          if (colores.length > 0 && !selectedColor) return alert("Por favor selecciona un color");
      }
      
      const finalPrice = product.descuento > 0 ? product.precio * (1 - product.descuento / 100) : product.precio;
      const item = { ...product, precio: finalPrice, precio_original: product.precio };
      if (hasVariants) {
          item.talla = selectedTalla;
          item.color = selectedColor;
          // ID único para el carrito basado en la variante para no juntar tallas distintas
          item.cartId = `${product._id}-${selectedTalla}-${selectedColor}`;
      } else {
          item.cartId = product._id;
      }
      
      addToCartAction(item);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
        {/* Navbar Simulado para Detalle */}
        <nav className="border-b border-gray-200 p-4 sticky top-0 bg-white/90 backdrop-blur-md z-50 flex items-center">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-black transition-colors">
                <ArrowLeft size={18} /> Volver
            </button>
            <div className="mx-auto flex justify-center items-center mr-12">
                <img src="/logo juschiri.jpeg" alt="JUS CHIRI" className="h-8 object-contain mix-blend-multiply" />
            </div>
        </nav>

        <div className="max-w-6xl mx-auto p-4 md:p-8 lg:p-12 grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 animate-fade-in">
            {/* Galería Visual */}
            <div className="space-y-4">
                <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden group flex items-center justify-center p-8">
                    {selectedImage ? (
                        isVideo(selectedImage) ? (
                            <video src={selectedImage} autoPlay loop muted playsInline className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 ease-out" />
                        ) : (
                            <img src={selectedImage} alt={product.nombre} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500 ease-out" />
                        )
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                            <ImageIcon size={48} strokeWidth={1} />
                            <p className="text-sm mt-4 text-gray-400">Sin Imagen</p>
                        </div>
                    )}
                </div>
                
                {galeria.length > 1 && (
                    <div className="flex gap-4 overflow-x-auto py-2 no-scrollbar">
                        {galeria.map((img, i) => (
                            <button 
                                key={i} 
                                onClick={() => setSelectedImage(img)}
                                className={`w-20 h-20 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden transition-all ${selectedImage === img ? 'ring-2 ring-black ring-offset-2' : 'hover:opacity-75 opacity-100'}`}
                            >
                                {isVideo(img) ? (
                                    <video src={img} autoPlay loop muted playsInline className="w-full h-full object-cover p-2" />
                                ) : (
                                    <img src={img} className="w-full h-full object-cover mix-blend-multiply p-2" alt=""/>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Info y Selectores */}
            <div className="flex flex-col justify-center space-y-8">
                <div className="space-y-3 animate-fade-in-up">
                    <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">{product.marca || 'GENÉRICO'}</p>
                    <h1 className="text-3xl md:text-4xl font-semibold leading-tight">{product.nombre}</h1>
                    {product.descuento > 0 ? (
                        <div className="mt-4 flex items-center gap-4 flex-wrap">
                            <p className="text-2xl font-semibold text-red-600">S/. {(product.precio * (1 - product.descuento / 100)).toLocaleString()}</p>
                            <p className="text-lg text-gray-400 line-through">S/. {product.precio?.toLocaleString()}</p>
                            <span className="bg-red-50 text-red-600 text-xs font-semibold px-2.5 py-1 rounded-full">-{product.descuento}% OFF</span>
                        </div>
                    ) : (
                        <p className="text-2xl font-semibold mt-4">S/. {product.precio?.toLocaleString()}</p>
                    )}
                </div>

                <div className="space-y-8 border-t border-gray-100 pt-8 animate-fade-in-up" style={{animationDelay: '100ms'}}>
                    {tallas.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-sm font-medium text-gray-900">Seleccionar Talla</p>
                            <div className="flex flex-wrap gap-3">
                                {tallas.map(t => (
                                    <button 
                                        key={t}
                                        onClick={() => setSelectedTalla(t)}
                                        className={`min-w-[3.5rem] h-12 px-4 flex items-center justify-center text-sm font-medium rounded-md border transition-all ${selectedTalla === t ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-gray-700 hover:border-black'}`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {colores.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-sm font-medium text-gray-900">Seleccionar Color</p>
                            <div className="flex flex-wrap gap-3">
                                {colores.map(c => (
                                    <button 
                                        key={c}
                                        onClick={() => setSelectedColor(c)}
                                        className={`px-6 h-12 text-sm font-medium rounded-md border transition-all ${selectedColor === c ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-gray-700 hover:border-black'}`}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="pt-6 animate-fade-in-up" style={{animationDelay: '200ms'}}>
                    <button 
                        onClick={handleAddToCart}
                        className="w-full h-14 bg-black text-white text-sm font-semibold uppercase tracking-wider rounded-md hover:bg-gray-800 transition-colors flex items-center justify-center gap-3 shadow-sm"
                    >
                        <ShoppingCart size={18} />
                        Agregar al Carrito
                    </button>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-5 mt-4 flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex-1">
                        <span className="font-medium text-gray-900">SKU:</span> {product.codigo}
                    </div>
                    <div className="w-px h-4 bg-gray-300"></div>
                    <div className="flex-1">
                        <span className="font-medium text-gray-900">Disponibilidad:</span> 
                        <span className={product.stock_actual > 0 ? "text-green-600 ml-1" : "text-red-500 ml-1"}>
                            {product.stock_actual > 0 ? 'En Stock' : 'Agotado'}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        {/* Productos Relacionados */}
        {related.length > 0 && (
            <div className="border-t border-gray-100 bg-white mt-16 pb-24">
                <div className="max-w-6xl mx-auto p-4 md:p-8">
                    <h2 className="text-xl font-semibold mb-8">También te podría interesar</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                        {related.map(rel => (
                            <Link to={`/producto/${rel.codigo}`} key={rel._id} className="group cursor-pointer">
                                <div className="aspect-[4/5] bg-gray-50 rounded-lg mb-4 overflow-hidden relative transition-all duration-300">
                                    {isVideo(rel.imagen_url) ? (
                                        <video src={rel.imagen_url} autoPlay loop muted playsInline className="w-full h-full object-contain p-6 group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <img src={rel.imagen_url || 'https://via.placeholder.com/400'} alt={rel.nombre} className="w-full h-full object-contain mix-blend-multiply p-6 group-hover:scale-105 transition-transform duration-500" />
                                    )}
                                </div>
                                <h3 className="font-medium text-sm line-clamp-2 leading-tight mb-1 text-gray-900 group-hover:underline">{rel.nombre}</h3>
                                <p className="text-sm text-gray-500">S/. {rel.precio?.toLocaleString()}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}
