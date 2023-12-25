// Importa os módulos necessários
import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { Readable, Transform } from 'node:stream'
import { WritableStream, TransformStream } from 'node:stream/web'
import { setTimeout } from 'node:timers/promises'
import csvtojson from 'csvtojson'

// Define a porta do servidor
const PORT = 3000

// Cria o servidor
createServer(async (req, res) => {
  // Define os cabeçalhos da resposta
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': '*',
  }

  // Se o método da requisição for OPTIONS, responde com 204 e termina a requisição
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers)
    res.end()
    return
  }

  // Quando a conexão for fechada, loga a quantidade de itens enviados
  req.once('close', () => console.log(`Connection closed with ${items} items`, items))

  // Inicializa o contador de itens
  let items = 0

  // Cria um stream de leitura a partir do arquivo CSV
  Readable.toWeb(createReadStream('./animeflv.csv'))
    // Converte o CSV para JSON
    .pipeThrough(Transform.toWeb(csvtojson()))
    // Transforma cada item do JSON
    .pipeThrough(new TransformStream({
      transform(chunk, controller) {
        // Converte o chunk para JSON
        const data = JSON.parse(Buffer.from(chunk))

        // Mapeia os dados para um novo formato
        const mappedData = {
          title: data.title,
          description: data.description,
          url_anime: data.url_anime,
        }

        // Enfileira os dados transformados para serem enviados
        controller.enqueue(JSON.stringify(mappedData).concat('\n'))
      }
    }))
    // Envia os dados para o cliente
    .pipeTo(new WritableStream({
      async write(chunk) {
        // Aguarda 1 segundo antes de enviar o próximo item
        await setTimeout(1 * 1000)

        // Incrementa o contador de itens
        items++

        // Escreve o chunk na resposta
        res.write(chunk)
      },
      close() {
        // Quando todos os itens foram enviados, termina a resposta
        res.end()
      }
    }))

  // Inicia a resposta com o status 200 e os cabeçalhos definidos
  res.writeHead(200, headers)
})
// Inicia o servidor na porta definida
.listen(PORT)
// Quando o servidor estiver ouvindo, loga a porta
.on('listening', () => console.log(`Server listening on port ${PORT}`))