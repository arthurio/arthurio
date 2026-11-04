import { describe, expect, it } from 'vitest';
import { profile } from './data/profile';
import { renderFallback } from './fallback';

function render(data = profile): HTMLElement {
  const root = document.createElement('div');
  renderFallback(root, data);
  return root;
}

describe('renderFallback', () => {
  it('renders the heading structure', () => {
    const root = render();
    expect(root.querySelector('h1')?.textContent).toBe(`${profile.name} (${profile.handle})`);
    const headings = [...root.querySelectorAll('h2')].map((h) => h.textContent);
    expect(headings).toEqual(['Experience', 'Skills', 'Projects', 'Contact']);
  });

  it('lists experience and skills', () => {
    const root = render();
    const lists = root.querySelectorAll('ul');
    expect(lists[0]?.querySelectorAll('li')).toHaveLength(profile.experience.length);
    expect(lists[1]?.querySelectorAll('li')).toHaveLength(profile.skills.length);
  });

  it('renders safe links with the expected hrefs', () => {
    const root = render();
    const anchors = [...root.querySelectorAll('a')];
    expect(anchors.length).toBeGreaterThan(0);
    for (const a of anchors) expect(a.rel).toBe('noopener noreferrer');
    const hrefs = anchors.map((a) => a.getAttribute('href'));
    for (const p of profile.projects) expect(hrefs).toContain(p.url);
    expect(hrefs).toContain(`mailto:${profile.email}`);
    expect(hrefs).toContain(profile.linkedin);
    expect(hrefs).toContain(profile.github);
  });

  it('replaces existing children', () => {
    const root = document.createElement('div');
    root.appendChild(document.createElement('span'));
    renderFallback(root, profile);
    renderFallback(root, profile);
    expect(root.querySelectorAll('h1')).toHaveLength(1);
    expect(root.querySelector('span')).toBeNull();
  });

  it('treats profile text as text, not HTML', () => {
    const root = render({ ...profile, name: '<b>x</b>' });
    expect(root.querySelector('b')).toBeNull();
    expect(root.querySelector('h1')?.textContent).toContain('<b>x</b>');
  });
});
