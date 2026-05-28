import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShoppingCart, ArrowLeft, Loader2, Image as ImageIcon } from 'lucide-react';
import { useCartStore } from '../store/cartStore';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const isVideo = (url) => url && /\.(mp4|webm|ogg|mov)$/i.test(url);

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState('');
  const [selectedTalla, setSelectedTalla] = useState('');
  const [selectedColor, setSelectedColor] = useState('');

  const addToCartAction = useCartStore(state => state.addToCart);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/products/${id}`);
        if (res.ok) {
          const p = await res.json();
          setProduct(p);
          setSelectedImage(p.imagen_url || '');

          // Relacionados por misma subcategoría o marca
          const relRes = await fetch(
            `${API_URL}/products?limit=8${p.subcategory?._id ? `&subcategory=${p.subcategory._id}` : `&marca=${encodeURIComponent(p.marca || '')}`}`
          );
          const relData = await relRes.json();
          setRelated((relData.products || []).filter(r => r._id !== p._id).slice(0, 4));
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };

    setSelectedTalla('');
    setSelectedColor('');
    fetchProduct();
    window.scrollTo(0, 0);
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
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-black text-white font-medium hover:bg-gray-800 transition-colors">
          Volver a la Tienda
        </button>
      </div>
    );
  }

  const hasVariants = product.variantes && product.variantes.length > 0;

  // Galería: imagen principal + galería adicional + imágenes de variantes (dedupe)
  const seen = new Set();
  const galeria = [product.imagen_url, ...(product.galeria || []), ...product.variantes.map(v => v.imagen)]
    .filter(img => img && !seen.has(img) && seen.add(img));

  // Solo tallas/colores con stock
  const variantesConStock = hasVariants ? product.variantes.filter(v => v.stock > 0) : [];
  const tallasConStock = [...new Set(variantesConStock.map(v => v.talla).filter(Boolean))];
  const coloresConStock = (selectedTalla
    ? variantesConStock.filter(v => v.talla === selectedTalla)
    : variantesConStock
  ).map(v => v.color).filter(Boolean);
  const coloresUnicos = [...new Set(coloresConStock)];

  // Variante seleccionada
  const varianteSeleccionada = hasVariants
    ? product.variantes.find(v =>
        (!selectedTalla || v.talla === selectedTalla) &&
        (!selectedColor || v.color === selectedColor) &&
        v.stock > 0
      )
    : null;

  const handleSelectTalla = (talla) => {
    setSelectedTalla(talla);
    setSelectedColor('');
    const v = product.variantes.find(v => v.talla === talla && v.imagen);
    if (v?.imagen) setSelectedImage(v.imagen);
  };

  const handleSelectColor = (color) => {
    setSelectedColor(color);
    const v = product.variantes.find(v => v.color === color && (!selectedTalla || v.talla === selectedTalla) && v.imagen);
    if (v?.imagen) setSelectedImage(v.imagen);
  };

  const handleAddToCart = () => {
    if (!hasVariants) return alert('Este producto no tiene variantes disponibles');
    if (tallasConStock.length > 0 && !selectedTalla) return alert('Por favor selecciona una talla');
    if (coloresUnicos.length > 0 && !selectedColor) return alert('Por favor selecciona un color');
    if (!varianteSeleccionada) return alert('Combinación sin stock');

    const varPrecio = varianteSeleccionada.precio || 0;
    const varDesc = varianteSeleccionada.descuento || 0;
    const finalPrice = varDesc > 0 ? varPrecio * (1 - varDesc / 100) : varPrecio;

    const item = {
      _id: product._id,
      nombre: product.nombre,
      imagen_url: selectedImage || product.imagen_url,
      marca: product.marca,
      precio: finalPrice,
      precio_original: varPrecio,
      descuento: varDesc,
      sku: varianteSeleccionada.sku,
      talla: varianteSeleccionada.talla,
      color: varianteSeleccionada.color,
      cartId: `${product._id}-${varianteSeleccionada.sku}`,
    };

    addToCartAction(item);
  };

  const stockActual = varianteSeleccionada ? varianteSeleccionada.stock : product.stock_actual;

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* Navbar */}
      <nav className="border-b border-gray-200 p-4 sticky top-0 bg-white/90 backdrop-blur-md z-50 flex items-center">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-black transition-colors">
          <ArrowLeft size={18} /> Volver
        </button>
        <div className="mx-auto flex justify-center items-center mr-12">
          <img src="/logo juschiri.jpeg" alt="JUS CHIRI" className="h-8 object-contain mix-blend-multiply" />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-4 md:p-8 lg:p-12 grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 animate-fade-in">
        {/* Galería */}
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
                  className={`w-20 h-20 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden transition-all ${selectedImage === img ? 'ring-2 ring-black ring-offset-2' : 'hover:opacity-75'}`}
                >
                  {isVideo(img) ? (
                    <video src={img} autoPlay loop muted playsInline className="w-full h-full object-cover p-2" />
                  ) : (
                    <img src={img} className="w-full h-full object-cover mix-blend-multiply p-2" alt="" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col justify-center space-y-8">
          <div className="space-y-3 animate-fade-in-up">
            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">{product.marca || 'GENÉRICO'}</p>
            <h1 className="text-3xl md:text-4xl font-semibold leading-tight">{product.nombre}</h1>
            {varianteSeleccionada ? (
              varianteSeleccionada.descuento > 0 ? (
                <div className="mt-4 flex items-center gap-4 flex-wrap">
                  <p className="text-2xl font-semibold text-red-600">S/. {(varianteSeleccionada.precio * (1 - varianteSeleccionada.descuento / 100)).toLocaleString()}</p>
                  <p className="text-lg text-gray-400 line-through">S/. {varianteSeleccionada.precio?.toLocaleString()}</p>
                  <span className="bg-red-50 text-red-600 text-xs font-semibold px-2.5 py-1 rounded-full">-{varianteSeleccionada.descuento}% OFF</span>
                </div>
              ) : (
                <p className="text-2xl font-semibold mt-4">S/. {varianteSeleccionada.precio?.toLocaleString()}</p>
              )
            ) : product.precio_min > 0 ? (
              <p className="text-2xl font-semibold mt-4 text-gray-500">Desde S/. {product.precio_min?.toLocaleString()}</p>
            ) : null}
          </div>

          <div className="space-y-8 border-t border-gray-100 pt-8 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            {/* Tallas con stock */}
            {tallasConStock.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-900">Seleccionar Talla</p>
                <div className="flex flex-wrap gap-3">
                  {tallasConStock.map(t => (
                    <button
                      key={t}
                      onClick={() => handleSelectTalla(t)}
                      className={`min-w-[3.5rem] h-12 px-4 flex items-center justify-center text-sm font-medium border transition-all ${selectedTalla === t ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-gray-700 hover:border-black'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Colores con stock */}
            {coloresUnicos.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-900">Seleccionar Color</p>
                <div className="flex flex-wrap gap-3">
                  {coloresUnicos.map(c => {
                    const varImg = product.variantes.find(v => v.color === c && v.imagen)?.imagen;
                    return (
                      <button
                        key={c}
                        onClick={() => handleSelectColor(c)}
                        className={`flex items-center gap-2 px-4 h-12 text-sm font-medium border transition-all ${selectedColor === c ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-gray-700 hover:border-black'}`}
                      >
                        {varImg && (
                          <img src={varImg} className={`w-6 h-6 object-cover ${selectedColor === c ? 'opacity-80' : 'mix-blend-multiply'}`} alt="" />
                        )}
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="pt-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <button
              onClick={handleAddToCart}
              className="w-full h-14 bg-black text-white text-sm font-semibold uppercase tracking-wider hover:bg-[#CCFF00] hover:text-black transition-colors flex items-center justify-center gap-3 shadow-sm"
            >
              <ShoppingCart size={18} />
              Agregar al Carrito
            </button>
          </div>

          <div className="bg-gray-50 rounded-lg p-5 flex items-center gap-4 text-sm text-gray-600">
            {varianteSeleccionada && (
              <>
                <div className="flex-1">
                  <span className="font-medium text-gray-900">SKU:</span>{' '}
                  <span className="font-mono">{varianteSeleccionada.sku}</span>
                </div>
                <div className="w-px h-4 bg-gray-300"></div>
              </>
            )}
            <div className="flex-1">
              <span className="font-medium text-gray-900">Disponibilidad:</span>
              <span className={stockActual > 0 ? 'text-green-600 ml-1' : 'text-red-500 ml-1'}>
                {stockActual > 0 ? 'En Stock' : 'Agotado'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Relacionados */}
      {related.length > 0 && (
        <div className="border-t border-gray-100 bg-white mt-16 pb-24">
          <div className="max-w-6xl mx-auto p-4 md:p-8">
            <h2 className="text-xl font-semibold mb-8">También te podría interesar</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {related.map(rel => (
                <Link to={`/producto/${rel._id}`} key={rel._id} className="group cursor-pointer">
                  <div className="aspect-[4/5] bg-gray-50 rounded-lg mb-4 overflow-hidden relative transition-all duration-300">
                    <img
                      src={rel.imagen_url || 'https://via.placeholder.com/400'}
                      alt={rel.nombre}
                      className="w-full h-full object-contain mix-blend-multiply p-6 group-hover:scale-105 transition-transform duration-500"
                    />
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
