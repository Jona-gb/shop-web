import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = resolve('src/lib/db.ts');
let text = readFileSync(file, 'utf8');
const old = `export async function getProducts(category?: string, q?: string): Promise<Product[]> {
  await ensureInitialized();
  const pool = await poolPromise;

  const conditions: string[] = [];
  const params: Array<unknown> = [];

  if (category) {
    conditions.push("category = ?");
    params.push(category);
  }

  if (q?.trim()) {
    const search = q.trim();
    const fulltextQuery = search
      .split(/\s+/)
      .map((term) => term.replace(/[^\w]+/g, ""))
      .filter(Boolean)
      .map((term) => `+${term}*`)
      .join(" ");

    if (fulltextQuery) {
      conditions.push("MATCH(name, description) AGAINST(? IN BOOLEAN MODE)");
      params.push(fulltextQuery);
    } else {
      conditions.push("(LOWER(name) LIKE ? OR LOWER(description) LIKE ?)");
      const searchTerm = `%${search.toLowerCase()}%`;
      params.push(searchTerm, searchTerm);
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM products ${whereClause} ORDER BY name`,
    params,
  );
  const productRows = rows as ProductRow[];
`;
const replacement = `export async function getProducts(category?: string, q?: string, limit?: number): Promise<Product[]> {
  await ensureInitialized();
  const pool = await poolPromise;

  const conditions: string[] = [];
  const params: Array<unknown> = [];

  if (category) {
    conditions.push("category = ?");
    params.push(category);
  }

  if (q?.trim()) {
    const search = q.trim();
    const fulltextQuery = search
      .split(/\s+/)
      .map((term) => term.replace(/[^\w]+/g, ""))
      .filter(Boolean)
      .map((term) => `+${term}*`)
      .join(" ");

    if (fulltextQuery) {
      conditions.push("MATCH(name, description) AGAINST(? IN BOOLEAN MODE)");
      params.push(fulltextQuery);
    } else {
      conditions.push("(LOWER(name) LIKE ? OR LOWER(description) LIKE ?)");
      const searchTerm = `%${search.toLowerCase()}%`;
      params.push(searchTerm, searchTerm);
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const query = `SELECT * FROM products ${whereClause} ORDER BY name${limit ? ' LIMIT ?' : ''}`;
  if (limit) params.push(limit);
  const [rows] = await pool.query<RowDataPacket[]>(query, params);
  const productRows = rows as ProductRow[];
`;
if (!text.includes(old)) {
  throw new Error('Old getProducts block not found');
}
text = text.replace(old, replacement);
writeFileSync(file, text, 'utf8');
console.log('patched getProducts');
