import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = resolve('src/lib/cart.tsx');
let content = readFileSync(file, 'utf8');
const oldImport = `import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";\nimport { useApiProducts } from "./products";\n`;
const newImport = `import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";\nimport { useApiProductsByIds } from "./products";\n`;
if (!content.includes(oldImport)) throw new Error('old import not found');
content = content.replace(oldImport, newImport);
const oldProvider = `export function CartProvider({ children }: { children: ReactNode }) {\n  const [items, setItems] = useState<CartItem[]>([]);\n  const { data: products = [] } = useApiProducts();\n\n  useEffect(() => {\n`;
const newProvider = `export function CartProvider({ children }: { children: ReactNode }) {\n  const [items, setItems] = useState<CartItem[]>([]);\n  const productIds = items.map((item) => item.productId);\n  const { data: products = [] } = useApiProductsByIds(productIds);\n\n  useEffect(() => {\n`;
if (!content.includes(oldProvider)) throw new Error('old provider not found');
content = content.replace(oldProvider, newProvider);
writeFileSync(file, content, 'utf8');
console.log('patched cart.tsx');
