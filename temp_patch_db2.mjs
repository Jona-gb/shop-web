import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = resolve('src/lib/db.ts');
let text = readFileSync(file, 'utf8');
text = text.replace(
  /export async function getProducts\(category\?: string, q\?: string\): Promise<Product\[]> \{/,
  'export async function getProducts(category?: string, q?: string, limit?: number): Promise<Product[]> {',
);
const oldQueryBlock = /\s*const \[rows\] = await pool\.query<RowDataPacket\[]>\(\s*`SELECT \* FROM products \$\{whereClause\} ORDER BY name`,\s*params,\s*\);/;
const newQueryBlock = `  const query = \\`SELECT * FROM products \\${whereClause} ORDER BY name${limit ? ' LIMIT ?' : ''}\\`;
  if (limit) params.push(limit);
  const [rows] = await pool.query<RowDataPacket[]>(query, params);`;
if (!oldQueryBlock.test(text)) {
  throw new Error('Old query block not found');
}
text = text.replace(oldQueryBlock, newQueryBlock);
writeFileSync(file, text, 'utf8');
console.log('patched db getProducts');
