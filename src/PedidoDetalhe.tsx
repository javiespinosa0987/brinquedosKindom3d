type Produto = {
  name: string
  quantity: number
  material: string
  color: string
}

type Pedido = {
  id: string
  cliente: string
  email: string
  telefone: string
  estado: string
  fecha: string
  total: number
  productos: Produto[]
}

type Props = {
  pedido: Pedido
  onClose: () => void
}

export default function PedidoDetalhe({
  pedido,
  onClose,
}: Props) {

  return (

    <div className="overlay">

      <div className="pedido-detalhe">

        <button
          className="close"
          onClick={onClose}
        >
          ✕
        </button>

        <h2>
          Pedido #{pedido.id}
        </h2>

        <hr />

        <p>
          <strong>Cliente:</strong><br/>
          {pedido.cliente}
        </p>

        <p>
          <strong>Telefone:</strong><br/>
          {pedido.telefone}
        </p>

        <p>
          <strong>Email:</strong><br/>
          {pedido.email}
        </p>

        <p>
          <strong>Estado:</strong><br/>
          {pedido.estado}
        </p>

        <p>
          <strong>Data:</strong><br/>
          {new Date(pedido.fecha).toLocaleString()}
        </p>

        <hr />

        <h3>Produtos</h3>

        {pedido.productos.map((produto,index)=>(

          <div key={index}>

            <strong>
              {produto.name}
            </strong>

            <p>

              Quantidade:
              {produto.quantity}

            </p>

            <p>

              Material:
              {produto.material}

            </p>

            <p>

              Cor:
              {produto.color}

            </p>

            <hr/>

          </div>

        ))}

        <h2>

          Total

        </h2>

        <h1>

          R$ {pedido.total.toFixed(2)}

        </h1>

      </div>

    </div>

  )

}