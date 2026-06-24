import {
  collection,
  addDoc,
  doc,
  setDoc,
  getDocs,
  updateDoc
} from "firebase/firestore";

import { db } from "./firebase";
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight, Check, ChevronDown, Clock3, CreditCard, Edit3, ImagePlus, LockKeyhole,
  MapPin, Menu, Minus, PackageCheck, Plus, QrCode, Search, ShoppingBag, Sparkles,
  Trash2, Upload, User, LogOut, X,
} from 'lucide-react'


type Category = 'Todos' | 'Brinquedos sensoriais' | 'Chaveiros' | 'Brinquedos'
type Product = {
  id: number
  name: string
  category: Exclude<Category, 'Todos'>
  price: number
  description: string
  leadTime: string
  tone: string
  shape: string
  badge?: string
  image?: string
}
type CartItem = Product & { quantity: number; material: string; color: string }
type ProductForm = Omit<Product, 'id'>
type Customer = { name: string; email: string; picture?: string }
type Pedido = {
  id: string
  cliente: string
  email: string
  telefone: string
  estado: string
  fecha: string
  productos: CartItem[]
  total: number
}

const defaultProducts: Product[] = [
  { id: 1, name: 'Dragão Articulado', category: 'Brinquedos', price: 69.9, description: 'Dragão flexível e articulado, impresso em uma única peça.', leadTime: '2 a 3 dias', tone: 'coral', shape: 'lamp', badge: 'Mais vendido' },
  { id: 2, name: 'Cubo Infinito', category: 'Brinquedos sensoriais', price: 39.9, description: 'Movimento contínuo para relaxar, focar e manter as mãos ocupadas.', leadTime: '1 a 2 dias', tone: 'sage', shape: 'pot' },
  { id: 3, name: 'Chaveiro Personalizado', category: 'Chaveiros', price: 19.9, description: 'Personalize com nome, cor ou uma pequena frase.', leadTime: '2 dias', tone: 'blue', shape: 'loop', badge: 'Personalizável' },
  { id: 4, name: 'Lagarta Articulada', category: 'Brinquedos sensoriais', price: 34.9, description: 'Peça articulada com movimento suave e textura agradável.', leadTime: '1 a 2 dias', tone: 'sand', shape: 'vase' },
  { id: 5, name: 'Chaveiro Controle', category: 'Chaveiros', price: 16.9, description: 'Mini controle leve e resistente para levar a paixão por jogos com você.', leadTime: '1 dia', tone: 'lavender', shape: 'stand' },
  { id: 6, name: 'Dinossauro Flexível', category: 'Brinquedos', price: 54.9, description: 'Dinossauro articulado para brincar, colecionar e decorar.', leadTime: '2 dias', tone: 'terracotta', shape: 'tray' },
]

const emptyProduct: ProductForm = {
  name: '', category: 'Brinquedos sensoriais', price: 0, description: '',
  leadTime: '2 dias', tone: 'coral', shape: 'loop', badge: '', image: '',
}

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

function App() {
  const [telefone, setTelefone] = useState("")
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const pedidosPendentes = pedidos.filter(
  pedido => pedido.estado === "pendente"
).length

const pedidosProducao = pedidos.filter(
  pedido => pedido.estado === "producao"
).length

const pedidosFinalizados = pedidos.filter(
  pedido => pedido.estado === "finalizado"
).length

const pedidosEntregues = pedidos.filter(
  pedido => pedido.estado === "entregue"
).length

const faturamentoTotal = pedidos.reduce(
  (total, pedido) => total + Number(pedido.total || 0),
  0
)
  const [category, setCategory] = useState<Category>('Todos')
  const [query, setQuery] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [selected, setSelected] = useState<Product | null>(null)
  const [material, setMaterial] = useState('PLA fosco')
  const [color, setColor] = useState('Coral')
  const [checkout, setCheckout] = useState(false)
  const [ordered, setOrdered] = useState(false)
  const [delivery, setDelivery] = useState<'pickup' | 'delivery'>('pickup')
  const [payment, setPayment] = useState<'pix' | 'credit' | 'debit'>('pix')
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('forma3d-products') || 'null') as Product[] | null
      const validCategories = ['Brinquedos sensoriais', 'Chaveiros', 'Brinquedos']
      return saved?.length && saved.every(product => validCategories.includes(product.category)) ? saved : defaultProducts
    }
    catch { return defaultProducts }
  })
  const [adminOpen, setAdminOpen] = useState(false)
  const [adminUnlocked, setAdminUnlocked] = useState(() => sessionStorage.getItem('forma3d-admin') === 'true')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminError, setAdminError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [productForm, setProductForm] = useState<ProductForm>(emptyProduct)
  const [accountOpen, setAccountOpen] = useState(false)
  const [customer, setCustomer] = useState<Customer | null>(() => {
    try { return JSON.parse(localStorage.getItem('kingdom3d-customer') || 'null') }
    catch { return null }
  })
  const [demoName, setDemoName] = useState('')
  const [demoEmail, setDemoEmail] = useState('')
  const googleButtonRef = useRef<HTMLDivElement>(null)
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
  console.log("GOOGLE CLIENT ID:", googleClientId)
  

  const [cart, setCart] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('forma3d-cart-br') || '[]') }
    catch { return [] }
  })
  useEffect(() => {
  loadPedidos()
  const changeStatus = async (
  pedidoId: string,
  estado: string
) => {

  try {

    await updateDoc(
      doc(db, "pedidos", pedidoId),
      {
        estado
      }
    )

    loadPedidos()

  } catch (error) {

    console.error(error)

  }
}
}, [])

const loadPedidos = async () => {
  try {
    const snapshot = await getDocs(
      collection(db, "pedidos")
    )

    const lista = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Pedido[]

    setPedidos(lista)

  } catch (error) {
    console.error(error)
  }
}
  useEffect(() => localStorage.setItem('forma3d-cart-br', JSON.stringify(cart)), [cart])
  useEffect(() => {
    try { localStorage.setItem('forma3d-products', JSON.stringify(products)) }
    catch { alert('Não foi possível salvar o catálogo. Remova algumas fotos ou use imagens menores.') }
  }, [products])
  useEffect(() => {
    if (customer) localStorage.setItem('kingdom3d-customer', JSON.stringify(customer))
    else localStorage.removeItem('kingdom3d-customer')
  }, [customer])
  useEffect(() => {
    if (!accountOpen || !googleClientId) return
    const renderGoogleButton = () => {
      if (!window.google || !googleButtonRef.current) return
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        use_fedcm_for_prompt: true,
        callback: async (response) => {
          try {
            const payload = JSON.parse(atob(response.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
            const userData = {
  name: payload.name,
  email: payload.email,
  picture: payload.picture,
  createdAt: new Date().toISOString()
  

};

setCustomer(userData);

 await setDoc(
  doc(db, "usuarios", payload.email),
  userData,
  { merge: true }
);
            setAccountOpen(false)
          } catch { alert('Não foi possível concluir o acesso com Google.') }
        },
      })
      googleButtonRef.current.innerHTML = ''
      window.google.accounts.id.renderButton(googleButtonRef.current, { theme: 'outline', size: 'large', width: 340, text: 'continue_with', shape: 'rectangular', locale: 'pt-BR' })
    }
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity]')
    if (existing) { renderGoogleButton(); existing.addEventListener('load', renderGoogleButton); return }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.dataset.googleIdentity = 'true'
    script.onload = renderGoogleButton
    document.head.appendChild(script)
  }, [accountOpen, googleClientId])

  const filtered = useMemo(() => products.filter(product =>
    (category === 'Todos' || product.category === category) &&
    product.name.toLowerCase().includes(query.toLowerCase())
  ), [category, query])
  const count = cart.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shipping = delivery === 'delivery' && subtotal < 200 ? 14.9 : 0

  const addToCart = (product: Product) => {
    setCart(current => {
      const match = current.find(item => item.id === product.id && item.material === material && item.color === color)
      if (match) return current.map(item => item === match ? { ...item, quantity: item.quantity + 1 } : item)
      return [...current, { ...product, quantity: 1, material, color }]
    })
    setSelected(null)
    setCartOpen(true)
  }

  const updateQuantity = (index: number, amount: number) => setCart(current => current
    .map((item, itemIndex) => itemIndex === index ? { ...item, quantity: item.quantity + amount } : item)
    .filter(item => item.quantity > 0))

  
  const finishOrder = async (event: React.FormEvent) => {
  event.preventDefault();


  const pedido = {
  cliente: customer?.name || "Visitante",
  email: customer?.email || "",
  telefone: telefone,
  productos: cart,
  total: subtotal + shipping,
  estado: "pendente",
  fecha: new Date().toISOString()
};

  console.log("DATOS DEL PEDIDO:", pedido);

  try {
    const docRef = await addDoc(
      collection(db, "pedidos"),
      pedido
    );
    const mensaje = `
🛒 NOVO PEDIDO

Pedido: ${docRef.id}

Cliente: ${pedido.cliente}

Email: ${pedido.email}

Telefone: ${pedido.telefone}

Total: R$ ${pedido.total}

Pagamento: ${payment}

Entrega: ${delivery}

Data: ${new Date().toLocaleString("pt-BR")}

Produtos:
${cart.map(item =>
`• ${item.name} x${item.quantity}`
).join('\n')}
`;

window.open(
`https://wa.me/5519994365222?text=${encodeURIComponent(mensaje)}`,
'_blank'
);

    console.log("PEDIDO GUARDADO:", docRef.id);

    alert(`Pedido salvo com sucesso: ${docRef.id}`);

    setOrdered(true);
    setCart([]);

  } catch (error) {
    console.error("ERRO FIREBASE PEDIDO:", error);

    alert(
      "ERRO FIREBASE: " +
      JSON.stringify(error)
    );
  }
};


  const openNewProduct = () => {
    setEditingId(null)
    setProductForm(emptyProduct)
  }

  const editProduct = (product: Product) => {
    setEditingId(product.id)
    setProductForm({ ...product })
  }

  const saveProduct = (event: React.FormEvent) => {
    event.preventDefault()
    if (editingId !== null) {
      setProducts(current => current.map(product => product.id === editingId ? { ...productForm, id: editingId } : product))
    } else {
      setProducts(current => [...current, { ...productForm, id: Date.now() }])
    }
    openNewProduct()
  }

  const deleteProduct = (id: number) => {
    if (!window.confirm('Excluir este produto do catálogo?')) return
    setProducts(current => current.filter(product => product.id !== id))
    if (editingId === id) openNewProduct()
  }

  const uploadProductImage = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (file.size > 10 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 10 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const image = new window.Image()
      image.onload = () => {
        const maxSize = 1200
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(image.width * scale)
        canvas.height = Math.round(image.height * scale)
        canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
        setProductForm(current => ({ ...current, image: canvas.toDataURL('image/jpeg', 0.78) }))
      }
      image.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const unlockAdmin = (event: React.FormEvent) => {
    event.preventDefault()
    if (adminPassword !== 'forma3d') {
      setAdminError('Senha incorreta.')
      return
    }
    sessionStorage.setItem('forma3d-admin', 'true')
    setAdminUnlocked(true)
    setAdminError('')
    setAdminPassword('')
  }

  const createDemoAccount = (event: React.FormEvent) => {
    event.preventDefault()
    setCustomer({ name: demoName, email: demoEmail })
    setAccountOpen(false)
    setDemoName('')
    setDemoEmail('')
  }

  const logout = () => {
    window.google?.accounts.id.disableAutoSelect()
    setCustomer(null)
  }
  const changeStatus = async (
  pedidoId: string,
  novoStatus: string
) => {
  try {

    await updateDoc(
      doc(db, "pedidos", pedidoId),
      {
        estado: novoStatus
      }
    )

    loadPedidos()

  } catch (error) {

    console.error(
      "Erro ao atualizar pedido:",
      error
    )

  }
}

  return (
    <div className="app">
      <div className="announcement">Entrega local grátis a partir de R$ 200 <span>Produzido sob demanda, sem desperdício.</span></div>
      <header>
        <a className="logo" href="#inicio" aria-label="Kingdom 3D início"><img src="/kingdom3d-logo.png" alt="Kingdom 3D Brinquedos Sensoriais"/><span>KINGDOM <b>3D</b></span></a>
        <nav className={mobileOpen ? 'nav-open' : ''}>
          <a href="#tienda" onClick={() => setMobileOpen(false)}>Loja</a>
          <a href="#personalizado" onClick={() => setMobileOpen(false)}>Sob medida</a>
          <a href="#proceso" onClick={() => setMobileOpen(false)}>Como funciona</a>
          <a href="#nosotros" onClick={() => setMobileOpen(false)}>Sobre nós</a>
        </nav>
        <div className="header-actions">
          {customer ? <div className="account-menu"><button className="account-button" onClick={() => setAccountOpen(true)}>{customer.picture ? <img src={customer.picture} alt="" referrerPolicy="no-referrer"/> : <span>{customer.name.charAt(0).toUpperCase()}</span>}<small>Olá, {customer.name.split(' ')[0]}</small></button><button className="logout-button" onClick={logout} aria-label="Sair da conta" title="Sair"><LogOut size={16}/></button></div> : <button className="account-button guest" onClick={() => setAccountOpen(true)}><User size={19}/><small>Entrar</small></button>}
          <button className="icon-button admin-trigger" aria-label="Abrir painel administrativo" title="Painel administrativo" onClick={() => setAdminOpen(true)}><LockKeyhole size={19}/></button>
          <button className="icon-button search-toggle" aria-label="Buscar" onClick={() => document.getElementById('search')?.focus()}><Search size={20}/></button>
          <button className="cart-button" onClick={() => setCartOpen(true)}><ShoppingBag size={20}/><span>Carrinho</span>{count > 0 && <b>{count}</b>}</button>
          <button className="icon-button menu-button" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Abrir menu"><Menu size={22}/></button>
        </div>
      </header>

      <main>
        <section className="hero" id="inicio">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={15}/> Impresso localmente, pensado para você</div>
            <h1>Ideias que<br/><em>ganham forma.</em></h1>
            <p>Brinquedos, chaveiros e peças sensoriais impressos com cuidado em nosso ateliê, um por um.</p>
            <div className="hero-actions">
              <a className="button primary" href="#tienda">Ver coleção <ArrowRight size={18}/></a>
              <a className="text-link" href="#personalizado">Tenho uma ideia sob medida</a>
            </div>
            <div className="hero-notes"><span><Check size={15}/> Materiais responsáveis</span><span><Check size={15}/> Produção local</span></div>
          </div>
          <div className="hero-visual" aria-label="Brinquedo articulado impresso em 3D">
            <div className="sun"></div><div className="pedestal"></div><div className="hero-vase"><i></i></div>
            <div className="floating-card"><span>A partir de</span><strong>R$ 19,90</strong><small>Peças personalizadas</small></div>
          </div>
        </section>

        <section className="shop section" id="tienda">
          <div className="section-heading"><div><span className="kicker">NOSSO CATÁLOGO</span><h2>Diversão que<br/>ganha forma.</h2></div><p>Brinquedos criativos, peças sensoriais e chaveiros feitos para encantar.</p></div>
          <div className="shop-tools">
            <div className="categories">{(['Todos', 'Brinquedos sensoriais', 'Chaveiros', 'Brinquedos'] as Category[]).map(item => <button className={category === item ? 'active' : ''} onClick={() => setCategory(item)} key={item}>{item}</button>)}</div>
            <label className="search"><Search size={18}/><input id="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar produtos"/></label>
          </div>
          <div className="product-grid">
            {filtered.map(product => <article className="product-card" key={product.id}>
              <button className={`product-art ${product.tone}`} onClick={() => setSelected(product)} aria-label={`Ver ${product.name}`}>
                {product.badge && <span className="badge">{product.badge}</span>}{product.image ? <img className="product-photo" src={product.image} alt=""/> : <div className={`object ${product.shape}`}><i></i></div>}<span className="quick">Ver opções</span>
              </button>
              <div className="product-info"><div><span>{product.category}</span><h3>{product.name}</h3></div><strong>{money(product.price)}</strong></div>
              <p>{product.description}</p>
            </article>)}
          </div>
          {filtered.length === 0 && <div className="empty">Não encontramos peças com esse nome.</div>}
        </section>

        <section className="custom section" id="personalizado">
          <div className="custom-art"><div className="wire-cube"></div><span>01</span><span>02</span><span>03</span></div>
          <div className="custom-copy"><span className="kicker light">SUA IDEIA, TRANSFORMADA EM OBJETO</span><h2>Não existe?<br/><em>Criamos com você.</em></h2><p>Conte o que você precisa ou envie seu arquivo 3D. Analisamos a ideia e apresentamos um orçamento claro antes de imprimir.</p><button className="button light-button" onClick={() => alert('Solicitação iniciada. Na próxima etapa, conectaremos o envio de arquivos e o formulário real.')}><Upload size={18}/> Solicitar orçamento</button><small>Resposta normalmente em até 24 horas</small></div>
        </section>

        <section className="process section" id="proceso">
          <div className="center-heading"><span className="kicker">SIMPLES ASSIM</span><h2>Da nossa impressora para suas mãos.</h2></div>
          <div className="steps"><div><b>01</b><ShoppingBag/><h3>Escolha ou imagine</h3><p>Escolha uma peça ou conte a sua ideia.</p></div><div><b>02</b><Sparkles/><h3>Nós produzimos</h3><p>Imprimimos sob demanda em nosso ateliê.</p></div><div><b>03</b><PackageCheck/><h3>Receba</h3><p>Retire no ateliê ou receba na sua região.</p></div></div>
        </section>

        <section className="about section" id="nosotros"><div><span className="kicker">FEITO PERTO DE VOCÊ</span><h2>Produzimos menos.<br/>Produzimos melhor.</h2></div><p>Cada objeto é produzido sob demanda, com materiais selecionados e sem estoque desnecessário. Isso significa menos resíduos e mais cuidado em cada detalhe.</p></section>
      </main>

      <footer><a className="logo footer-logo" href="#inicio"><img src="/kingdom3d-logo.png" alt="Kingdom 3D"/><span>KINGDOM <b>3D</b></span></a><p>Brinquedos sensoriais e impressão 3D.</p><span>© 2026 Kingdom 3D</span></footer>

      {selected && <div className="overlay" onMouseDown={() => setSelected(null)}><div className="product-modal" onMouseDown={e => e.stopPropagation()}>
        <button className="close" onClick={() => setSelected(null)}><X/></button><div className={`modal-art ${selected.tone}`}>{selected.image ? <img className="modal-photo" src={selected.image} alt={selected.name}/> : <div className={`object ${selected.shape}`}><i></i></div>}</div>
        <div className="modal-copy"><span className="kicker">{selected.category}</span><h2>{selected.name}</h2><p>{selected.description}</p><div className="modal-meta"><span><Clock3 size={17}/> Pronto em {selected.leadTime}</span><strong>{money(selected.price)}</strong></div>
        <label>Material<select value={material} onChange={e => setMaterial(e.target.value)}><option>PLA fosco</option><option>PLA seda (+ R$ 10)</option><option>PETG resistente (+ R$ 15)</option></select><ChevronDown size={17}/></label>
        <fieldset><legend>Cor</legend><div className="swatches">{['Coral','Areia','Sálvia','Azul-marinho'].map(item => <button className={color === item ? 'selected' : ''} onClick={() => setColor(item)} key={item}><i className={item.toLowerCase().replace('á', 'a').replace(' ', '-')}></i>{item}</button>)}</div></fieldset>
        <button className="button primary wide" onClick={() => addToCart(selected)}>Adicionar ao carrinho <ArrowRight size={18}/></button></div>
      </div></div>}

      {cartOpen && <><div className="drawer-backdrop" onClick={() => setCartOpen(false)}></div><aside className="cart-drawer">
        <div className="drawer-head"><div><span>Seu carrinho</span><h2>{count} {count === 1 ? 'peça' : 'peças'}</h2></div><button className="close" onClick={() => setCartOpen(false)}><X/></button></div>
        <div className="cart-list">{cart.length === 0 ? <div className="cart-empty"><ShoppingBag/><h3>Seu carrinho está esperando novas ideias.</h3><button className="button primary" onClick={() => setCartOpen(false)}>Explorar coleção</button></div> : cart.map((item, index) => <div className="cart-item" key={`${item.id}-${item.material}-${item.color}`}><div className={`cart-thumb ${item.tone}`}>{item.image ? <img src={item.image} alt=""/> : <div className={`object ${item.shape}`}><i></i></div>}</div><div className="cart-item-info"><div><h3>{item.name}</h3><small>{item.material} · {item.color}</small></div><div className="cart-item-bottom"><div className="quantity"><button onClick={() => updateQuantity(index, -1)}><Minus/></button><span>{item.quantity}</span><button onClick={() => updateQuantity(index, 1)}><Plus/></button></div><strong>{money(item.price * item.quantity)}</strong></div></div><button className="remove" onClick={() => setCart(current => current.filter((_, i) => i !== index))}><Trash2/></button></div>)}</div>
        {cart.length > 0 && <div className="drawer-total"><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><p>Frete calculado na próxima etapa.</p><button className="button primary wide" onClick={() => { setCartOpen(false); setCheckout(true) }}>Continuar pedido <ArrowRight size={18}/></button></div>}
      </aside></>}

      {accountOpen && <div className="overlay account-overlay" onMouseDown={() => setAccountOpen(false)}><div className="account-modal" onMouseDown={event => event.stopPropagation()}><button className="close" onClick={() => setAccountOpen(false)}><X/></button>
        <img className="account-logo" src="/kingdom3d-logo.png" alt="Kingdom 3D"/>
        {customer ? <div className="account-profile">{customer.picture ? <img className="profile-photo" src={customer.picture} alt="" referrerPolicy="no-referrer"/> : <div className="profile-letter">{customer.name.charAt(0).toUpperCase()}</div>}<span className="kicker">SUA CONTA</span><h2>{customer.name}</h2><p>{customer.email}</p><div className="account-benefits"><span><Check/> Checkout mais rápido</span><span><Check/> Dados salvos neste navegador</span><span><Check/> Compra como cliente identificado</span></div><button className="button logout-wide" onClick={() => { logout(); setAccountOpen(false) }}><LogOut size={17}/> Sair da conta</button></div> : <div className="account-login">
          <span className="kicker">BEM-VINDO AO REINO</span><h2>Crie sua conta</h2><p>Entre com sua Conta do Google para agilizar suas próximas compras. Criar uma conta é opcional.</p>
          {googleClientId ? <div className="google-button" ref={googleButtonRef}></div> : <><div className="google-unconfigured"><span className="google-g">G</span><div><strong>Google ainda não configurado</strong><small>Adicione o Client ID para ativar o acesso real.</small></div></div><div className="divider"><span>modo de demonstração</span></div><form className="demo-account-form" onSubmit={createDemoAccount}><label>Nome<input required value={demoName} onChange={event => setDemoName(event.target.value)} placeholder="Seu nome"/></label><label>E-mail do Google<input required type="email" value={demoEmail} onChange={event => setDemoEmail(event.target.value)} placeholder="voce@gmail.com"/></label><button className="button primary wide" type="submit">Criar conta de demonstração <ArrowRight size={18}/></button></form></>}
          <button className="guest-checkout" onClick={() => setAccountOpen(false)}>Agora não, continuar sem conta</button><small className="privacy-note">Usaremos apenas nome, e-mail e foto de perfil para identificar sua conta.</small>
        </div>}
      </div></div>}

      {adminOpen && <div className="overlay admin-overlay"><div className={`admin-modal ${adminUnlocked ? 'unlocked' : ''}`}><button className="close" onClick={() => setAdminOpen(false)}><X/></button>{!adminUnlocked ? <form className="admin-login" onSubmit={unlockAdmin}>
        <div className="admin-icon"><LockKeyhole/></div><span className="kicker">ÁREA RESTRITA</span><h2>Painel administrativo</h2><p>Entre para cadastrar e organizar as peças exibidas na loja.</p>
        <label>Senha<input type="password" required value={adminPassword} onChange={event => setAdminPassword(event.target.value)} placeholder="Digite a senha" autoFocus/></label>{adminError && <span className="admin-error">{adminError}</span>}
        <button className="button primary wide" type="submit">Entrar no painel <ArrowRight size={18}/></button><small>Senha inicial desta demonstração: <strong>forma3d</strong></small>
      </form> : <div className="admin-content">
        <div className="dashboard-grid">

  <div className="dashboard-card">
    <h3>Pendentes</h3>
    <strong>{pedidosPendentes}</strong>
  </div>

  <div className="dashboard-card">
    <h3>Em Produção</h3>
    <strong>{pedidosProducao}</strong>
  </div>

  <div className="dashboard-card">
    <h3>Finalizados</h3>
    <strong>{pedidosFinalizados}</strong>
  </div>

  <div className="dashboard-card">
    <h3>Entregues</h3>
    <strong>{pedidosEntregues}</strong>
  </div>

  <div className="dashboard-card faturamento">
    <h3>Faturamento Total</h3>
    <strong>
      {money(faturamentoTotal)}
    </strong>
  </div>

</div>
        <div className="orders-panel">

  <h3>Pedidos Recebidos</h3>

  {pedidos.map(pedido => (

    <div
      key={pedido.id}
      className="order-card"
    >

      <h4>{pedido.cliente}</h4>

      <p>{pedido.email}</p>

      <strong>
        {money(pedido.total)}
      </strong>

      <small>
        {new Date(
          pedido.fecha
        ).toLocaleString()}
      </small>

      <select
        value={pedido.estado}
        onChange={(e) =>
          changeStatus(
            pedido.id,
            e.target.value
          )
        }
      >

        <option value="pendente">Pendente</option>
        <option value="producao">Em Produção</option>
        <option value="finalizado">Finalizado</option>
        <option value="entregue">Entregue</option>

      </select>

    </div>

  ))}

</div>
        <div className="admin-head"><div><span className="kicker">KINGDOM 3D</span><h2>Gerenciar catálogo</h2><p>{products.length} produtos cadastrados</p></div><button className="button admin-new" onClick={openNewProduct}><Plus size={18}/> Novo produto</button></div>
        <div className="admin-layout">
          <form className="product-form" onSubmit={saveProduct}>
            <div className="form-title"><h3>{editingId === null ? 'Cadastrar produto' : 'Editar produto'}</h3>{editingId !== null && <button type="button" onClick={openNewProduct}>Cancelar edição</button>}</div>
            <label className="image-upload"><input type="file" accept="image/*" onChange={event => uploadProductImage(event.target.files?.[0])}/>{productForm.image ? <img src={productForm.image} alt="Prévia do produto"/> : <span><ImagePlus/><strong>Adicionar foto</strong><small>JPG, PNG ou WebP · máximo 10 MB</small></span>}</label>
            {productForm.image && <button className="remove-image" type="button" onClick={() => setProductForm(current => ({ ...current, image: '' }))}>Remover foto</button>}
            <div className="admin-form-grid">
              <label className="full">Nome do produto<input required value={productForm.name} onChange={event => setProductForm(current => ({ ...current, name: event.target.value }))} placeholder="Ex.: Dragão articulado"/></label>
              <label>Categoria<select value={productForm.category} onChange={event => setProductForm(current => ({ ...current, category: event.target.value as ProductForm['category'] }))}><option>Brinquedos sensoriais</option><option>Chaveiros</option><option>Brinquedos</option></select></label>
              <label>Preço (R$)<input required type="number" min="0" step="0.01" value={productForm.price || ''} onChange={event => setProductForm(current => ({ ...current, price: Number(event.target.value) }))} placeholder="0,00"/></label>
              <label>Prazo de produção<input required value={productForm.leadTime} onChange={event => setProductForm(current => ({ ...current, leadTime: event.target.value }))} placeholder="2 dias"/></label>
              <label>Selo opcional<input value={productForm.badge || ''} onChange={event => setProductForm(current => ({ ...current, badge: event.target.value }))} placeholder="Novidade"/></label>
              <label className="full">Descrição<textarea required rows={3} value={productForm.description} onChange={event => setProductForm(current => ({ ...current, description: event.target.value }))} placeholder="Descreva a peça, tamanho e diferenciais."/></label>
              <label>Cor do cartão<select value={productForm.tone} onChange={event => setProductForm(current => ({ ...current, tone: event.target.value }))}><option value="coral">Coral</option><option value="sage">Verde</option><option value="blue">Azul</option><option value="sand">Areia</option><option value="lavender">Lilás</option><option value="terracotta">Terracota</option></select></label>
            </div>
            <button className="button primary wide" type="submit">{editingId === null ? 'Adicionar ao catálogo' : 'Salvar alterações'} <Check size={18}/></button>
          </form>
          <div className="admin-products"><h3>Produtos publicados</h3>{products.length === 0 ? <div className="admin-empty">Nenhum produto cadastrado.</div> : products.map(product => <article className="admin-product" key={product.id}><div className={`admin-thumb ${product.tone}`}>{product.image ? <img src={product.image} alt=""/> : <div className={`object ${product.shape}`}><i></i></div>}</div><div><span>{product.category}</span><h4>{product.name}</h4><strong>{money(product.price)}</strong></div><div className="admin-actions"><button onClick={() => editProduct(product)} title="Editar"><Edit3/></button><button onClick={() => deleteProduct(product.id)} title="Excluir"><Trash2/></button></div></article>)}</div>
        </div>
        <div className="admin-note"><LockKeyhole/><span>Este painel salva dados somente neste navegador. Antes de publicar, conecte autenticação e banco de dados reais.</span></div>
      </div>}</div></div>}

      {checkout && <div className="overlay checkout-overlay"><div className="checkout-modal"><button className="close" onClick={() => { setCheckout(false); setOrdered(false) }}><X/></button>{ordered ? <div className="success"><div><Check/></div><span className="kicker">PEDIDO RECEBIDO</span><h2>Já está ganhando forma.</h2><p>Registramos seu pedido <strong>#F3D-1042</strong>. {payment === 'pix' ? 'O QR Code PIX será enviado com a confirmação.' : 'O pagamento com cartão foi registrado em modo de demonstração.'} Você receberá os próximos passos por e-mail.</p><button className="button primary" onClick={() => { setCheckout(false); setOrdered(false) }}>Voltar para a loja</button></div> : <>
        <div className="checkout-title"><span className="kicker">FINALIZAR PEDIDO</span><h2>Como você quer receber?</h2></div><form onSubmit={finishOrder}>
          {customer ? <div className="checkout-identity"><div>{customer.picture ? <img src={customer.picture} alt="" referrerPolicy="no-referrer"/> : <span>{customer.name.charAt(0).toUpperCase()}</span>}<p>Comprando como <strong>{customer.name}</strong><small>{customer.email}</small></p></div><button type="button" onClick={logout}>Sair</button></div> : <div className="guest-identity"><User/><div><strong>Compra como visitante</strong><small>Você pode finalizar sem criar uma conta.</small></div><button type="button" onClick={() => setAccountOpen(true)}>Entrar com Google</button></div>}
          <div className="delivery-options"><button type="button" className={delivery === 'pickup' ? 'selected' : ''} onClick={() => setDelivery('pickup')}><PackageCheck/><span><strong>Retirada no ateliê</strong><small>Grátis · Avisaremos quando estiver pronto</small></span></button><button type="button" className={delivery === 'delivery' ? 'selected' : ''} onClick={() => setDelivery('delivery')}><MapPin/><span><strong>Entrega local</strong><small>R$ 14,90 · Região urbana</small></span></button></div>
          <div className="form-grid"><label>Nome completo<input required defaultValue={customer?.name || ''} placeholder="Seu nome"/></label><label>Celular<input
  required
  type="tel"
  value={telefone}
  onChange={(e) => setTelefone(e.target.value)}
  placeholder="(11) 99999-9999"
/></label><label className="full">E-mail<input required type="email" defaultValue={customer?.email || ''} placeholder="voce@exemplo.com.br"/></label>{delivery === 'delivery' && <><label className="full">Endereço<input required placeholder="Rua, número e complemento"/></label><label>CEP<input required inputMode="numeric" placeholder="00000-000"/></label><label>Cidade<input required placeholder="Sua cidade"/></label></>}</div>
          <section className="payment-section">
            <h3>Forma de pagamento</h3>
            <div className="payment-options">
              <button type="button" className={payment === 'pix' ? 'selected' : ''} onClick={() => setPayment('pix')}><QrCode/><span><strong>PIX</strong><small>Aprovação rápida</small></span></button>
              <button type="button" className={payment === 'credit' ? 'selected' : ''} onClick={() => setPayment('credit')}><CreditCard/><span><strong>Crédito</strong><small>Parcele sua compra</small></span></button>
              <button type="button" className={payment === 'debit' ? 'selected' : ''} onClick={() => setPayment('debit')}><CreditCard/><span><strong>Débito</strong><small>Pagamento à vista</small></span></button>
            </div>
            {payment === 'pix' ? <div className="pix-message"><QrCode/><div><strong>Pagamento via PIX</strong><p>Após confirmar o pedido, você receberá um QR Code e o código copia e cola. O pedido será produzido após a confirmação do pagamento.</p></div></div> : <div className="card-fields form-grid">
              <label className="full">Número do cartão<input required inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000" maxLength={19}/></label>
              <label className="full">Nome impresso no cartão<input required autoComplete="cc-name" placeholder="NOME COMO ESTÁ NO CARTÃO"/></label>
              <label>Validade<input required inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" maxLength={5}/></label>
              <label>CVV<input required inputMode="numeric" autoComplete="cc-csc" placeholder="000" maxLength={4}/></label>
              {payment === 'credit' && <label className="full">Parcelamento<select required defaultValue="1"><option value="1">1x de {money(subtotal + shipping)} sem juros</option><option value="2">2x de {money((subtotal + shipping) / 2)} sem juros</option><option value="3">3x de {money((subtotal + shipping) / 3)} sem juros</option></select><ChevronDown size={17}/></label>}
            </div>}
          </section>
          <div className="order-summary"><div><span>Produtos</span><strong>{money(subtotal)}</strong></div><div><span>{delivery === 'pickup' ? 'Retirada no ateliê' : 'Entrega local'}</span><strong>{shipping ? money(shipping) : 'Grátis'}</strong></div><div className="grand-total"><span>Total</span><strong>{money(subtotal + shipping)}</strong></div></div>
          <button className="button primary wide" type="submit">{payment === 'pix' ? 'Gerar pagamento PIX' : `Pagar com cartão de ${payment === 'credit' ? 'crédito' : 'débito'}`} <ArrowRight size={18}/></button><p className="demo-note">Modo de demonstração: nenhum pagamento ou dado de cartão será processado.</p>
        </form></>}</div></div>}
    </div>
  )
}






export default App;

