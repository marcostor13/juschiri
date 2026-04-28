import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShoppingCart, ArrowLeft, Loader2, Image as ImageIcon } from 'lucide-react';
import { useCartStore } from '../store/cartStore';

const API_URL = import.meta.env.VITE_API_URL || '/api';

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin w-12 h-12 text-black" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <h1 className="text-4xl font-black uppercase tracking-tighter mb-4">PRODUCTO NO ENCONTRADO</h1>
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-black text-white font-bold uppercase hover:bg-neon-green hover:text-black border-4 border-black transition-colors">Volver a la Tienda</button>
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
      
      const item = { ...product };
      if (hasVariants) {
          item.talla = selectedTalla;
          item.color = selectedColor;
          // ID único para el carrito basado en la variante para no juntar tallas distintas
          item.cartId = `${product._id}-${selectedTalla}-${selectedColor}`;
      } else {
          item.cartId = product._id;
      }
      
      addToCartAction(item);
      navigate('/');
  };

  return (
    <div className="min-h-screen bg-white">
        {/* Navbar Simulado para Detalle */}
        <nav className="border-b-4 border-black p-4 sticky top-0 bg-white z-50 flex items-center">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 font-bold uppercase border-2 border-transparent hover:border-black p-2 transition-all">
                <ArrowLeft /> Volver
            </button>
            <div className="mx-auto font-black text-2xl tracking-tighter italic mr-12">
                JUS CHIRI
            </div>
        </nav>

        <div className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-12 animate-fade-in">
            {/* Galería Visual */}
            <div className="space-y-4">
                <div className="aspect-square border-4 border-black bg-gray-50 p-4 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group">
                    {selectedImage ? (
                        <img src={selectedImage} alt={product.nombre} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500 ease-out" />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                            <ImageIcon size={64} />
                            <p className="font-mono mt-4 font-bold uppercase">Sin Imagen</p>
                        </div>
                    )}
                </div>
                
                {galeria.length > 1 && (
                    <div className="flex gap-4 overflow-x-auto py-4 no-scrollbar">
                        {galeria.map((img, i) => (
                            <button 
                                key={i} 
                                onClick={() => setSelectedImage(img)}
                                className={`w-24 h-24 flex-shrink-0 border-4 bg-gray-50 p-2 transition-all ${selectedImage === img ? 'border-black shadow-[4px_4px_0px_0px_rgba(204,255,0,1)]' : 'border-gray-200 hover:border-black opacity-60 hover:opacity-100'}`}
                            >
                                <img src={img} className="w-full h-full object-cover mix-blend-multiply" alt=""/>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Info y Selectores */}
            <div className="flex flex-col justify-center space-y-8">
                <div className="space-y-2 animate-fade-up">
                    <p className="font-mono text-gray-500 font-bold uppercase tracking-widest">{product.marca || 'GENÉRICO'}</p>
                    <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">{product.nombre}</h1>
                    <p className="text-3xl font-black text-neon-green drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] mt-4">S/. {product.precio?.toLocaleString()}</p>
                </div>

                <div className="space-y-6 border-t-4 border-black pt-6 animate-fade-up" style={{animationDelay: '100ms'}}>
                    {tallas.length > 0 && (
                        <div className="space-y-3">
                            <p className="font-bold uppercase tracking-widest text-sm">SELECCIONAR TALLA</p>
                            <div className="flex flex-wrap gap-3">
                                {tallas.map(t => (
                                    <button 
                                        key={t}
                                        onClick={() => setSelectedTalla(t)}
                                        className={`w-14 h-14 flex items-center justify-center font-mono font-bold text-lg border-2 transition-all ${selectedTalla === t ? 'bg-black text-white border-black shadow-[4px_4px_0px_0px_rgba(204,255,0,1)] -translate-y-1' : 'bg-white border-gray-300 hover:border-black hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {colores.length > 0 && (
                        <div className="space-y-3">
                            <p className="font-bold uppercase tracking-widest text-sm">SELECCIONAR COLOR</p>
                            <div className="flex flex-wrap gap-3">
                                {colores.map(c => (
                                    <button 
                                        key={c}
                                        onClick={() => setSelectedColor(c)}
                                        className={`px-6 py-3 font-mono font-bold uppercase border-2 transition-all ${selectedColor === c ? 'bg-black text-white border-black shadow-[4px_4px_0px_0px_rgba(204,255,0,1)] -translate-y-1' : 'bg-white border-gray-300 hover:border-black hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="pt-8 animate-fade-up" style={{animationDelay: '200ms'}}>
                    <button 
                        onClick={handleAddToCart}
                        className="w-full py-6 bg-black text-neon-green font-black text-2xl uppercase tracking-widest border-4 border-black hover:bg-neon-green hover:text-black transition-colors flex items-center justify-center gap-4 group shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)]"
                    >
                        <ShoppingCart className="group-hover:scale-125 transition-transform" size={32}/>
                        AGREGAR AL CARRITO
                    </button>
                </div>
                
                <div className="border-2 border-black p-4 bg-gray-50 mt-8">
                    <p className="font-mono text-xs uppercase font-bold leading-relaxed">
                        SKU: {product.codigo}<br/>
                        DISPONIBILIDAD: {product.stock_actual > 0 ? 'EN STOCK' : 'AGOTADO'}
                    </p>
                </div>
            </div>
        </div>

        {/* Productos Relacionados */}
        {related.length > 0 && (
            <div className="border-t-4 border-black bg-white mt-12 pb-24">
                <div className="max-w-7xl mx-auto p-4 md:p-8">
                    <h2 className="text-3xl font-black uppercase tracking-tighter mb-8 italic">TAMBIÉN TE PODRÍA INTERESAR</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                        {related.map(rel => (
                            <Link to={`/producto/${rel.codigo}`} key={rel._id} className="group cursor-pointer">
                                <div className="aspect-[3/4] bg-gray-100 border-2 border-black mb-4 overflow-hidden relative shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:-translate-y-2 group-hover:shadow-[8px_8px_0px_0px_rgba(204,255,0,1)] transition-all duration-300">
                                    <img src={rel.imagen_url || 'https://via.placeholder.com/400'} alt={rel.nombre} className="w-full h-full object-contain mix-blend-multiply p-4 group-hover:scale-110 transition-transform duration-500" />
                                </div>
                                <h3 className="font-black uppercase text-sm line-clamp-2 leading-tight mb-1 group-hover:underline">{rel.nombre}</h3>
                                <p className="font-mono font-bold text-gray-500">S/. {rel.precio?.toLocaleString()}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}
