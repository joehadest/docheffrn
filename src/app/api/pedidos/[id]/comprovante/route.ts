import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        
        if (!id) {
            return NextResponse.json(
                { success: false, message: 'ID do pedido não fornecido' },
                { status: 400 }
            );
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { success: false, message: 'Nenhum arquivo enviado' },
                { status: 400 }
            );
        }

        // Validar tipo de arquivo (apenas imagens)
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { success: false, message: 'Tipo de arquivo não permitido. Apenas imagens são aceitas.' },
                { status: 400 }
            );
        }

        // Validar tamanho (máximo 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            return NextResponse.json(
                { success: false, message: 'Arquivo muito grande. Tamanho máximo: 5MB' },
                { status: 400 }
            );
        }

        // Criar diretório de uploads se não existir
        const uploadsDir = join(process.cwd(), 'public', 'uploads', 'comprovantes');
        if (!existsSync(uploadsDir)) {
            await mkdir(uploadsDir, { recursive: true });
        }

        // Gerar nome único para o arquivo
        const timestamp = Date.now();
        const fileExtension = file.name.split('.').pop();
        const fileName = `${id}-${timestamp}.${fileExtension}`;
        const filePath = join(uploadsDir, fileName);

        // Salvar arquivo
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        // URL pública do arquivo
        const fileUrl = `/uploads/comprovantes/${fileName}`;

        // Atualizar pedido no banco de dados
        const { db } = await connectToDatabase();
        const collection = db.collection('pedidos');

        const result = await collection.updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    comprovante: {
                        url: fileUrl,
                        uploadedAt: new Date().toISOString()
                    }
                }
            }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json(
                { success: false, message: 'Pedido não encontrado' },
                { status: 404 }
            );
        }

        // Broadcast evento de comprovante enviado
        try {
            const { broadcast } = await import('@/lib/sse');
            broadcast({ 
                type: 'comprovante-enviado', 
                pedidoId: id 
            });
        } catch (e) {
            console.error('Falha broadcast comprovante', e);
        }

        return NextResponse.json({
            success: true,
            data: {
                url: fileUrl,
                uploadedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Erro ao fazer upload do comprovante:', error);
        return NextResponse.json(
            { success: false, message: 'Erro ao fazer upload do comprovante' },
            { status: 500 }
        );
    }
}

