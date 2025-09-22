"use client";
import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

interface ButtonBaseProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  full?: boolean;
  children?: React.ReactNode;
}

// Estender de HTMLMotionProps<'button'> para compatibilidade com framer-motion
export type ButtonProps = ButtonBaseProps & Omit<HTMLMotionProps<'button'>, keyof ButtonBaseProps>;

const variants: Record<string, string> = {
  primary: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-md shadow-red-900/20',
  secondary: 'bg-[#2a2a2a] hover:bg-[#343434] text-gray-200 border border-gray-700',
  danger: 'bg-red-700 hover:bg-red-600 text-white',
  ghost: 'bg-transparent hover:bg-white/5 text-gray-300',
  outline: 'border border-red-600/60 text-red-400 hover:bg-red-600/10'
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  loading = false,
  disabled,
  leftIcon,
  rightIcon,
  full,
  className = '',
  ...rest
}) => {
  const content: React.ReactNode = loading ? 'Carregando...' : children;
  return (
    <motion.button
      whileHover={!disabled && !loading ? { scale: 1.02 } : undefined}
      whileTap={!disabled && !loading ? { scale: 0.97 } : undefined}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-red-600/60 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${full ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {leftIcon && <span className="text-base flex items-center">{leftIcon}</span>}
      <span className="whitespace-nowrap">{content}</span>
      {rightIcon && !loading && <span className="text-base flex items-center">{rightIcon}</span>}
    </motion.button>
  );
};

export default Button;
