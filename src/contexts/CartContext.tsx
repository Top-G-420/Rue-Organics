import { createContext, useContext, useReducer, ReactNode, useEffect } from 'react'; // Added useEffect import

// Updated CartItem with size and variant_id, prices as numbers
export interface CartItem {
  id: string;
  name: string;
  price: number; // Changed to number for consistent numeric calculations
  quantity: number;
  imageUrl?: string;
  pricing_tiers?: Array<{
    min_quantity: number;
    price: number; // Changed to number
  }>;
  size?: string; // e.g., '500ml'
  variant_id?: string; // For order tracking
}

// Actions for reducer (unchanged)
type CartAction =
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'quantity'> & { quantity: number } }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'REMOVE_ITEM'; payload: { id: string } }
  | { type: 'CLEAR_CART' };

// Reducer function (unchanged)
const cartReducer = (state: CartItem[], action: CartAction): CartItem[] => {
  switch (action.type) {
    case 'ADD_ITEM':
      const existingItem = state.find(item => item.id === action.payload.id);
      if (existingItem) {
        return state.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: item.quantity + action.payload.quantity }
            : item
        );
      }
      return [...state, { ...action.payload }];
    case 'UPDATE_QUANTITY':
      return state.map(item =>
        item.id === action.payload.id
          ? { ...item, quantity: Math.max(1, action.payload.quantity) }
          : item
      ).filter(item => item.quantity > 0); // Remove if quantity becomes 0
    case 'REMOVE_ITEM':
      return state.filter(item => item.id !== action.payload.id);
    case 'CLEAR_CART':
      return [];
    default:
      return state;
  }
};

// Helper to get unit price (unchanged)
const getUnitPrice = (item: CartItem): number => {
  if (!item.pricing_tiers || item.pricing_tiers.length === 0) {
    return item.price;
  }
  const tier = item.pricing_tiers.find(t => item.quantity >= t.min_quantity);
  return tier ? tier.price : item.price;
};

// Context type (unchanged)
interface CartContextType {
  cart: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity: number }) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number; // Computed with tiers
}

// Create context (unchanged)
const CartContext = createContext<CartContextType | undefined>(undefined);

// Provider component
export const CartProvider = ({ children }: { children: ReactNode }) => {
  // NEW: Custom initial state loader
  const loadInitialCart = (): CartItem[] => {
    try {
      const stored = localStorage.getItem('cart'); // Key: 'cart' (customize if needed)
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to load cart from localStorage:', error);
      return [];
    }
  };

  const [cart, dispatch] = useReducer(cartReducer, loadInitialCart()); // CHANGED: Use loaded state as initial value

  // NEW: Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(cart));
    } catch (error) {
      console.warn('Failed to save cart to localStorage:', error);
    }
  }, [cart]); // Dependency: re-run on cart changes

  // Rest of the functions (unchanged)
  const addItem = (item: Omit<CartItem, 'quantity'> & { quantity: number }) => {
    dispatch({ type: 'ADD_ITEM', payload: { ...item, quantity: item.quantity } });
  };

  const updateQuantity = (id: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
  };

  const removeItem = (id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { id } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
    // Optional: Clear localStorage explicitly (already handled by useEffect)
    localStorage.removeItem('cart');
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Subtotal calculation using tiers (unchanged)
  const subtotal = cart.reduce((sum, item) => {
    const unitPrice = getUnitPrice(item);
    return sum + unitPrice * item.quantity;
  }, 0);

  return (
    <CartContext.Provider value={{ cart, addItem, updateQuantity, removeItem, clearCart, totalItems, subtotal }}>
      {children}
    </CartContext.Provider>
  );
};

// Custom hook (unchanged)
export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};