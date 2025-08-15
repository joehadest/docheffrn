import { MongoClient } from 'mongodb';

if (!process.env.MONGODB_URI) {
    throw new Error('Por favor, defina a variável de ambiente MONGODB_URI');
}

const uri = process.env.MONGODB_URI;
const options = {
    maxPoolSize: 10,
    minPoolSize: 5,
    maxIdleTimeMS: 60000,
    connectTimeoutMS: 10000,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
    // Em desenvolvimento, use uma variável global para preservar a conexão
    let globalWithMongo = global as typeof globalThis & {
        _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
        client = new MongoClient(uri, options);
        globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
} else {
    // Em produção, é melhor não usar uma variável global
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
}

export async function connectToDatabase() {
    try {
        console.log('Tentando conectar ao MongoDB...');
        console.log('URI:', uri);
        console.log('Database:', process.env.MONGODB_DB || 'do-cheff-pedidos');

        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB || 'do-cheff-pedidos');

        console.log('Conexão com MongoDB estabelecida com sucesso!');
        return { client, db };
    } catch (error) {
        console.error('Erro ao conectar ao MongoDB:', error);
        throw error;
    }
}

// Exporta uma função para fechar a conexão quando necessário
export async function closeDatabaseConnection() {
    if (client) {
        await client.close();
    }
} 