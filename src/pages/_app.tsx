import type { AppProps } from 'next/app';
import { CartProvider } from '../contexts/CartContext';
import { MenuProvider } from '../contexts/MenuContext';
import '../app/globals.css';

export default function App({ Component, pageProps }: AppProps) {
    return (
        <CartProvider>
            <MenuProvider>
                <Component {...pageProps} />
            </MenuProvider>
        </CartProvider>
    );
} 