import { Context } from "grammy";

const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;

export async function sendLongMessage(ctx: Context, text: string, options?: any): Promise<void> {
  if (text.length <= TELEGRAM_MAX_MESSAGE_LENGTH) {
    await ctx.reply(text, options);
    return;
  }

  console.log(`📝 Сообщение слишком длинное (${text.length} символов), разбиваем на части...`);

  const parts = splitMessage(text);
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const partOptions = { ...options };
    
    if (i === 0) {
      partOptions.reply_to_message_id = ctx.message?.message_id;
    }
    
    try {
      await ctx.reply(part, partOptions);
      
      if (i < parts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`❌ Ошибка отправки части ${i + 1}:`, error);
      
      if (i === 0) {
        await ctx.reply("❌ Ответ слишком длинный. Попробуйте уточнить запрос.");
        return;
      }
    }
  }
  
  console.log(`✅ Отправлено ${parts.length} частей сообщения`);
}

function splitMessage(text: string): string[] {
  const parts: string[] = [];
  let currentPart = "";
  
  const lines = text.split('\n');
  
  for (const line of lines) {
    const testPart = currentPart + (currentPart ? '\n' : '') + line;
    
    if (testPart.length <= TELEGRAM_MAX_MESSAGE_LENGTH - 100) {
      currentPart = testPart;
    } else {
      if (currentPart) {
        parts.push(currentPart);
        currentPart = line;
      } else {
        const chunks = splitLongLine(line);
        parts.push(...chunks);
      }
    }
  }
  
  if (currentPart) {
    parts.push(currentPart);
  }
  
  return parts.filter(part => part.trim().length > 0);
}

function splitLongLine(line: string): string[] {
  const chunks: string[] = [];
  let currentChunk = "";
  
  const words = line.split(' ');
  
  for (const word of words) {
    const testChunk = currentChunk + (currentChunk ? ' ' : '') + word;
    
    if (testChunk.length <= TELEGRAM_MAX_MESSAGE_LENGTH - 100) {
      currentChunk = testChunk;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = word;
      } else {
        if (word.length > TELEGRAM_MAX_MESSAGE_LENGTH - 100) {
          const subChunks = splitByCharacters(word);
          chunks.push(...subChunks);
        } else {
          chunks.push(word);
        }
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

function splitByCharacters(text: string): string[] {
  const chunks: string[] = [];
  const maxLength = TELEGRAM_MAX_MESSAGE_LENGTH - 100;
  
  for (let i = 0; i < text.length; i += maxLength) {
    chunks.push(text.slice(i, i + maxLength));
  }
  
  return chunks;
}

export function truncateMessage(text: string, maxLength: number = TELEGRAM_MAX_MESSAGE_LENGTH - 100): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  const truncated = text.slice(0, maxLength - 50);
  const lastNewline = truncated.lastIndexOf('\n');
  
  if (lastNewline > maxLength * 0.8) {
    return truncated.slice(0, lastNewline) + '\n\n⚠️ Ответ сокращен. Уточните запрос для получения полной информации.';
  }
  
  return truncated + '\n\n⚠️ Ответ сокращен. Уточните запрос для получения полной информации.';
}
