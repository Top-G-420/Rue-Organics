// Updated src/pages/ProductDetail.tsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';

// Updated Product interface with variants and price handling
interface Product {
  id: string;
  name: string;
  description: string;
  price?: number | string; // Added price field to handle DB values (number or string)
  controls_or_benefits: string;
  image_url?: string;
  pricing_tiers?: Array<{
    min_quantity: number;
    price: number | string; // Handle number or string from DB
  }>;
}

interface ProductVariant {
  id: string;
  product_id: string;
  size: string; // e.g., '200ml', '1L'
  price: number | string; // Handle number or string from DB
  stock: number;
}

interface Review {
  id: string;
  product_id: string;
  user_id: string;
  user_email?: string; // Anonymized or full
  comment: string;
  rating: number; // 1-5
  created_at: string;
}

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { user, session } = useAuth();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>(''); // Selected variant size
  const [selectedVariantId, setSelectedVariantId] = useState<string>(''); // Selected variant ID
  const [newReview, setNewReview] = useState({ comment: '', rating: 5 });
  const [reviewError, setReviewError] = useState('');

  // Helper to format price for display (handles number or string from DB)
  const formatPriceForDisplay = (rawPrice: number | string | undefined): string => {
    if (rawPrice === undefined || rawPrice === null) return 'KES ___';
    if (typeof rawPrice === 'number') return `KES ${rawPrice}`;
    if (typeof rawPrice === 'string') {
      return rawPrice.includes('KES') ? rawPrice : `KES ${rawPrice}`;
    }
    return 'KES ___';
  };

  // Helper to parse price to number (for cart storage)
  const parsePriceToNumber = (rawPrice: number | string | undefined): number => {
    if (rawPrice === undefined || rawPrice === null) return 0;
    if (typeof rawPrice === 'number') return rawPrice;
    if (typeof rawPrice === 'string') {
      return parseFloat(rawPrice.replace('KES ', '').replace(/[^\d.]/g, '')) || 0;
    }
    return 0;
  };

  // Fetch product, variants, and reviews
  const { data: product, isLoading: productLoading, error: productError } = useQuery<Product>({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: variants = [] } = useQuery<ProductVariant[]>({
    queryKey: ['variants', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const { data: reviews = [] } = useQuery<Review[]>({
    queryKey: ['reviews', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*') // Simplified: Removed join to avoid potential RLS or access issues; use 'Anonymous' for all
        .eq('product_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(review => ({
        ...review,
        user_email: 'Anonymous', // Default to anonymized
      }));
    },
    enabled: !!id,
  });

  // Mutation for adding review
  const addReviewMutation = useMutation({
    mutationFn: async (reviewData: { comment: string; rating: number }) => {
      if (!user) throw new Error('Must be signed in');
      const { error } = await supabase
        .from('reviews')
        .insert({
          product_id: id,
          user_id: user.id,
          comment: reviewData.comment,
          rating: reviewData.rating,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', id] }); // Removed exact: true to ensure broader invalidation if needed
      setNewReview({ comment: '', rating: 5 });
      setReviewError(''); // Clear any previous errors
    },
    onError: (error: any) => {
      setReviewError(error.message || 'Failed to add review.');
    },
  });

  const handleQuantityChange = (delta: number) => {
    setQuantity(prev => Math.max(1, prev + delta));
  };

  const getPriceForVariant = (): string => {
    let rawPrice: number | string | undefined;
    if (!selectedVariantId) {
      rawPrice = product?.price;
    } else {
      const variant = variants.find(v => v.id === selectedVariantId);
      rawPrice = variant?.price;
    }
    return formatPriceForDisplay(rawPrice);
  };

  const currentPrice = getPriceForVariant();

  // Get numeric price for cart
  const getNumericPriceForCart = (): number => {
    let rawPrice: number | string | undefined;
    if (!selectedVariantId) {
      rawPrice = product?.price;
    } else {
      const variant = variants.find(v => v.id === selectedVariantId);
      rawPrice = variant?.price;
    }
    return parsePriceToNumber(rawPrice);
  };

  const handleAddToCart = () => {
    if (product && selectedVariantId) {
      const variant = variants.find(v => v.id === selectedVariantId);
      if (variant) {
        const numericPrice = getNumericPriceForCart();
        const numericTiers = product.pricing_tiers?.map(tier => ({
          min_quantity: tier.min_quantity,
          price: parsePriceToNumber(tier.price),
        })) || undefined;
        addItem({
          id: product.id,
          name: `${product.name} - ${variant.size}`,
          price: numericPrice, // Now number
          imageUrl: product.image_url,
          quantity,
          size: variant.size, // Include size
          variant_id: variant.id, // For order tracking
          pricing_tiers: numericTiers, // Parsed to numbers
        });
        navigate('/cart');
      }
    }
  };

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      setReviewError('Please sign in to add a review.');
      return;
    }
    if (!newReview.comment.trim()) {
      setReviewError('Comment cannot be empty.');
      return;
    }
    addReviewMutation.mutate(newReview);
  };

  if (productLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-white justify-center items-center">
        <div className="text-lg text-gray-600">Loading product...</div>
      </div>
    );
  }

  if (productError || !product) {
    return (
      <div className="flex flex-col min-h-screen bg-white justify-center items-center">
        <div className="text-lg text-red-600">Product not found.</div>
        <button onClick={() => navigate('/')} className="mt-4 bg-green-600 text-white px-4 py-2 rounded-md">
          Back to Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Fixed Header with Back Button - Mobile App Style */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white shadow-md px-4 py-3 flex items-center">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-white mr-2"
          aria-label="Go back"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold truncate flex-1">Product Details</h1>
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/cart')}
            className="p-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-white relative" 
            aria-label="Cart"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 3.5A2 2 0 005 19h14a2 2 0 001.1-3.7l-1.5-3.5z" />
            </svg>
          </button>
        </div>
      </header>

      <main className="pt-16 px-4 pb-8">
        {/* Product Image */}
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-auto object-cover rounded-lg mb-4" />
        ) : (
          <div className="bg-gray-200 h-64 flex items-center justify-center rounded-lg mb-4">
            <span className="text-gray-500 text-lg">Product Image</span>
          </div>
        )}

        {/* Product Info */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>
          <p className="text-2xl font-bold text-green-600 mb-4">{currentPrice}</p>
          <p className="text-gray-700 mb-4 text-base leading-relaxed">{product.description}</p>
          
          <div className="mb-6">
            <h2 className="font-semibold text-gray-800 mb-2 text-lg">Controls / Benefits:</h2>
            <ul className="text-gray-600 space-y-1 text-sm list-disc list-inside">
              {product.controls_or_benefits.split('\n').filter(line => line.trim()).map((line, idx) => (
                <li key={idx}>{line}</li>
              ))}
            </ul>
          </div>

          {/* Size Selector */}
          <div className="mb-6">
            <label className="block font-semibold text-gray-800 mb-2">Select Size:</label>
            <select
              value={selectedSize}
              onChange={(e) => {
                const size = e.target.value;
                setSelectedSize(size);
                const variant = variants.find(v => v.size === size);
                if (variant) setSelectedVariantId(variant.id);
              }}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            >
              <option value="">Choose size...</option>
              {variants.map((variant) => (
                <option key={variant.id} value={variant.size}>
                  {variant.size} - {formatPriceForDisplay(variant.price)} ({variant.stock > 0 ? `${variant.stock} in stock` : 'Out of stock'})
                </option>
              ))}
            </select>
          </div>

          {/* Pricing Tiers Display (if applicable) */}
          {product.pricing_tiers && product.pricing_tiers.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-gray-800 mb-2">Bulk Pricing (per unit)</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>1 unit: {formatPriceForDisplay(product.price)}</li>
                {product.pricing_tiers.map((tier, idx) => (
                  <li key={idx}>{tier.min_quantity}+ units: {formatPriceForDisplay(tier.price)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Quantity Selector (only if size selected) */}
        {selectedSize && (
          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg mb-6">
            <span className="text-gray-700 font-medium">Quantity:</span>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleQuantityChange(-1)}
                className="w-10 h-10 bg-white border border-gray-300 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                disabled={quantity <= 1}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="text-xl font-semibold min-w-[2rem] text-center">{quantity}</span>
              <button
                onClick={() => handleQuantityChange(1)}
                className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Add to Cart Button */}
        {selectedSize && (
          <button
            onClick={handleAddToCart}
            disabled={!selectedSize}
            className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add {quantity} x {selectedSize} to Cart ({currentPrice})
          </button>
        )}

        {/* Reviews Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Customer Reviews ({reviews.length})</h2>
          
          {/* Add Review Form (if signed in) */}
          {session ? (
            <form onSubmit={handleAddReview} className="bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Add Your Review</h3>
              <div className="flex space-x-1 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewReview({ ...newReview, rating: star })}
                    className={`text-2xl ${newReview.rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <textarea
                placeholder="Share your thoughts..."
                value={newReview.comment}
                onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-md mb-3 focus:outline-none focus:ring-2 focus:ring-green-500"
                rows={3}
                required
              />
              {reviewError && <p className="text-red-600 text-sm mb-2">{reviewError}</p>}
              <button
                type="submit"
                disabled={addReviewMutation.isLoading}
                className="bg-green-600 text-white py-2 px-4 rounded-md font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {addReviewMutation.isLoading ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg mb-6 text-center">
              <p className="text-gray-600 mb-2">Sign in to add a review.</p>
              <button
                onClick={() => navigate('/account')}
                className="bg-green-600 text-white py-2 px-4 rounded-md font-medium hover:bg-green-700"
              >
                Sign In
              </button>
            </div>
          )}

          {/* Reviews List */}
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center mb-2">
                  <div className="flex space-x-1 mr-2">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className={`text-sm ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`}>
                        ★
                      </span>
                    ))}
                  </div>
                  <span className="text-sm text-gray-500">by {review.user_email}</span>
                  <span className="text-xs text-gray-400 ml-auto">{new Date(review.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-gray-700">{review.comment}</p>
              </div>
            ))}
            {reviews.length === 0 && (
              <p className="text-gray-500 text-center">No reviews yet. Be the first!</p>
            )}
          </div>
        </div>

        {/* Additional Info Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="font-medium text-gray-800 mb-2">Shipping & Returns</h3>
          <p className="text-gray-600 text-sm mb-2">Delivery times depend on the courier service.</p>
          <p className="text-gray-600 text-sm mb-4">Don't forget to check for current offers!</p>
          <button
            onClick={() => navigate('/offers')}
            className="bg-green-600 text-white py-2 px-4 rounded-md font-medium hover:bg-green-700 mb-4 w-full sm:w-auto"
          >
            View Offers
          </button>
          <p className="text-gray-600 text-sm italic">Terms and conditions apply.</p>
        </div>
      </main>
    </div>
  );
};

export default ProductDetail;