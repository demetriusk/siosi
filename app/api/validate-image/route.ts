import { NextRequest } from 'next/server'
import OpenAI from 'openai'

export async function POST(req: NextRequest) {
  const { photoUrl } = await req.json()
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{
      role: "user",
      content: [
        {
          type: "text",
          text: `Is this image valid for makeup analysis?

Valid = ONE human face, makeup visible, front/3-4 angle, real photo.
Invalid = multiple faces, no face, illustration, profile view, no makeup.

Return JSON: {
  "valid": true/false,
  "reason": "explanation",
  "face_count": number
}`
        },
        {
          type: "image_url",
          image_url: { url: photoUrl }
        }
      ]
    }],
    response_format: { type: "json_object" },
    max_tokens: 150
  })
  
  return Response.json(JSON.parse(response.choices[0].message.content!))
}