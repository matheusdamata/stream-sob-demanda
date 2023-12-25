// Define a URL da API
const API_URL = 'http://localhost:3000'

// Inicializa um contador
let counter = 0

// Função assíncrona para consumir a API
async function consumeAPI(signal) {
  // Faz uma requisição para a API
  const response = await fetch(API_URL, {
    signal
  })

  // Lê o corpo da resposta, decodifica o texto e analisa o NDJSON
  const reader = response.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(parseNDJSON())
    // .pipeTo(new WritableStream({
    //   write(chunk) {
    //     console.log(chunk)
    //   }
    // }))

  return reader
}

// Função para adicionar conteúdo ao HTML
function appendToHTML(element) {
  return new WritableStream({
    write({ title, description, url_anime }) {
      // Incrementa o contador
      counter++

      // Cria um cartão HTML com os dados recebidos
      const card = `
        <article>
          <div class="text">
            <h3>[${counter}] - ${title}</h3>
            <p>${description.slice(0, 75)}</p>

            <a href="${url_anime}">Here's  why</a>
          </div>
        </article>
      `

      // Adiciona o cartão ao elemento HTML
      element.innerHTML += card
    },
    abort() {
      console.log('aborted')
    }
  })
}

// Função para analisar NDJSON
function parseNDJSON() {
  let ndjsonBuffer = ''

  return new TransformStream({
    transform(chunk, controller) {
      // Adiciona o chunk ao buffer
      ndjsonBuffer += chunk

      // Divide o buffer em itens
      const items = ndjsonBuffer.split('\n')

      // Enfileira cada item para ser processado
      items.slice(0, -1)
        .forEach(item => controller.enqueue(JSON.parse(item)))

      // Atualiza o buffer com o último item
      ndjsonBuffer = items[items.length - 1]
    },
    flush(controller) {
      if (!ndjsonBuffer) return

      // Enfileira o último item do buffer para ser processado
      controller.enqueue(JSON.parse(ndjsonBuffer))
    }
  })
}

// Obtém os elementos HTML
const [
  start,
  stop,
  cards
] = ['start', 'stop', 'cards'].map(item => document.getElementById(item))

// Inicializa um AbortController
let abortController = new AbortController()

// Adiciona um evento de clique ao botão 'start'
start.addEventListener('click', async () => {
  // Consome a API e canaliza o resultado para o HTML
  const readable = await consumeAPI(abortController.signal)
  readable.pipeTo(appendToHTML(cards))
})

// Adiciona um evento de clique ao botão 'stop'
stop.addEventListener('click', () => {
  // Aborta a requisição
  abortController.abort()
  console.log('aborting...')

  // Reinicializa o AbortController
  abortController = new AbortController()
})