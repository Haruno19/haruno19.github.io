import { parse } from 'yaml';
import type { post } from "./post";

const posts_glob = import.meta.glob<string>('../../posts/*.md', { query: '?raw', import: 'default', eager: true });
const assets_glob = import.meta.glob<string>('../../posts/assets/*', { query: '?url', import: 'default', eager: true });

export const posts : post[] = [];

for (const path in posts_glob) {
  const yaml = parse(posts_glob[path].split('```yml')[1].split("```")[0]);
  posts.push({
    id: path.split('/').pop()!.replace(/\.md$/, ''),
    title: yaml['title'] as string,
    date: yaml['date'] as string,
    filename: path,
    content: posts_glob[path].split('```')[2],
    cover: yaml['cover'] ? assets_glob[`../../posts/assets/${yaml['cover']}`] : undefined
  });
}

posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export function getPost(id: string | undefined) {
  return posts.find((post) => post.id === id);
}
