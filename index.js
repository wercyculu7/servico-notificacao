// servico-notificacao/index.js
const { Pool } = require('pg');
const { Resend } = require('resend');

// --- INICIALIZAÇÃO DOS SERVIÇOS ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const resend = new Resend(process.env.RESEND_API_KEY);

// --- FUNÇÃO PRINCIPAL ---
async function verificarExpiracoes() {
    console.log('--- Iniciando verificação diária de expirações ---');

    try {
        // Pergunta ao banco: "Me dê o e-mail e a data de expiração de todos os clientes
        // cuja data de expiração seja EXATAMENTE daqui a 5 dias."
        const queryResult = await pool.query(
            `SELECT email_revendedor, data_expiracao 
             FROM revendedores_premium 
             WHERE data_expiracao::date = (NOW() + interval '5 days')::date`
        );

        if (queryResult.rowCount === 0) {
            console.log('Nenhuma assinatura expirando em 5 dias. Nenhuma ação necessária.');
            return;
        }

        console.log(`Encontradas ${queryResult.rowCount} assinaturas para notificar.`);

        // Para cada cliente encontrado, envia o e-mail
        for (const cliente of queryResult.rows) {
            const emailCliente = cliente.email_revendedor;
            if (!emailCliente) {
                console.log(`AVISO: Cliente com data de expiração ${cliente.data_expiracao} não possui e-mail cadastrado. Pulando.`);
                continue;
            }

            console.log(`Enviando notificação para ${emailCliente}...`);

            const emailHtml = `
                <h1 style="color: #333;">Seu Acesso ao Suporte Premium está prestes a expirar!</h1>
                <p>Olá!</p>
                <p>Este é um lembrete amigável de que seu acesso anual ao nosso Suporte Premium exclusivo irá expirar em 5 dias.</p>
                <p>Para garantir que você continue recebendo nosso atendimento prioritário sem interrupções, você pode renovar seu acesso agora mesmo.</p>
                  

                <a href="COLOQUE_AQUI_O_SEU_LINK_DE_CHECKOUT_DA_RENOVACAO" style="background-color: #007bff; color: white; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Quero Renovar Meu Suporte Agora</a>
                  
  

                <p>Se tiver qualquer dúvida, basta responder a este e-mail.</p>
                <p>Atenciosamente,  
<strong>Alan Garcia e Equipe</strong></p>
            `;

            await resend.emails.send({
                from: 'Alan Garcia <contato@alangarcia.com.br>',
                to: emailCliente,
                subject: 'Atenção: Seu acesso ao Suporte Premium expira em 5 dias!',
                html: emailHtml
            });

            console.log(`E-mail de notificação enviado com sucesso para ${emailCliente}.`);
        }

    } catch (error) {
        console.error('ERRO CRÍTICO durante a verificação de expirações:', error);
    } finally {
        console.log('--- Verificação diária concluída ---');
        // Fecha a conexão com o banco para o serviço poder encerrar
        await pool.end();
    }
}

// --- EXECUÇÃO ---
// Quando o serviço for iniciado pela Railway, ele simplesmente chama a função principal.
verificarExpiracoes();
