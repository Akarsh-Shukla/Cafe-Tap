import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { upload } from '../../lib/util'

export default function MenuEditor({ cafe, uid }) {
  const [cats, setCats] = useState([]), [msg, setMsg] = useState('')
  const load = async () => {
    const { data } = await supabase.from('menu_categories').select('*,menu_items(*)').eq('cafe_id', cafe.id).order('sort_order')
    setCats((data || []).map(c => ({ ...c, menu_items: [...c.menu_items].sort((a, b) => a.sort_order - b.sort_order) })))
  }
  useEffect(() => { load() }, [cafe.id])
  const run = async p => { const { error } = await p; setMsg(error ? error.message : ''); load() }
  const addCat = () => run(supabase.from('menu_categories').insert({ cafe_id: cafe.id, name: 'New category', sort_order: cats.length }))
  const upCat = (id, f) => run(supabase.from('menu_categories').update(f).eq('id', id))
  const delCat = id => confirm('Delete this category and all items in it?') && run(supabase.from('menu_categories').delete().eq('id', id))
  const addItem = c => run(supabase.from('menu_items').insert({ cafe_id: cafe.id, category_id: c.id, name: 'New item', price_paise: 0, sort_order: c.menu_items.length }))
  const upItem = (id, f) => run(supabase.from('menu_items').update(f).eq('id', id))
  const delItem = id => confirm('Remove this item?') && run(supabase.from('menu_items').delete().eq('id', id))
  const photo = async (id, file) => { if (!file) return; try { upItem(id, { image_url: await upload(file, uid) }) } catch (e) { setMsg(e.message) } }
  return (<>
    <p className="muted">Edit any field and tap outside it to save. Untick “Available” to mark an item sold out.</p>
    {msg && <p className="err">{msg}</p>}
    {cats.map(c => <div key={c.id} className="panel">
      <div className="row"><input defaultValue={c.name} onBlur={e => e.target.value !== c.name && upCat(c.id, { name: e.target.value })} aria-label="Category name" />
        <label className="chk"><input type="checkbox" checked={c.is_visible} onChange={e => upCat(c.id, { is_visible: e.target.checked })} /> Visible</label>
        <button className="link danger" onClick={() => delCat(c.id)}>Delete</button></div>
      {c.menu_items.map(i => <div key={i.id} className="sub">
        <input defaultValue={i.name} placeholder="Item name" onBlur={e => e.target.value !== i.name && upItem(i.id, { name: e.target.value })} />
        <div className="row"><input type="number" min="0" step="1" defaultValue={i.price_paise / 100} aria-label="Price in rupees" onBlur={e => { const p = Math.round(parseFloat(e.target.value || 0) * 100); if (p >= 0 && p !== i.price_paise) upItem(i.id, { price_paise: p }) }} />
          <label className="chk"><input type="checkbox" checked={i.is_available} onChange={e => upItem(i.id, { is_available: e.target.checked })} /> Available</label></div>
        <input defaultValue={i.description || ''} placeholder="Short description" onBlur={e => e.target.value !== (i.description || '') && upItem(i.id, { description: e.target.value })} />
        <div className="row"><select value={i.diet || ''} onChange={e => upItem(i.id, { diet: e.target.value || null })} aria-label="Veg or non-veg"><option value="">Veg / non-veg: not set</option><option value="veg">Veg</option><option value="nonveg">Non-veg</option><option value="egg">Contains egg</option></select>
          <select value={i.badge || ''} onChange={e => upItem(i.id, { badge: e.target.value || null })} aria-label="Badge"><option value="">No badge</option><option value="bestseller">Bestseller</option><option value="chefs">Chef’s pick</option><option value="new">New</option><option value="popular">Popular</option></select></div>
        <div className="row">{i.image_url && <img className="thumb" src={i.image_url} alt="" />}
          <label className="filebtn">{i.image_url ? 'Change photo' : 'Add photo'}<input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => photo(i.id, e.target.files[0])} /></label>
          {i.image_url && <button className="link" onClick={() => upItem(i.id, { image_url: null })}>Remove photo</button>}
          <button className="link danger" onClick={() => delItem(i.id)}>Delete item</button></div>
      </div>)}
      <button className="ghost" onClick={() => addItem(c)}>+ Add item</button>
    </div>)}
    <button onClick={addCat}>+ Add category</button>
  </>)
}
