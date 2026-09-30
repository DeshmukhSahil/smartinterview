import { createHash } from "node:crypto";
import { z } from "zod";
import { requireIngestSecret, failure, cors, interviewDb } from "@/lib/hiring/server";
import { desktopDeliverySchema, desktopNotes } from "@/lib/hiring/desktopDelivery";
export const dynamic = "force-dynamic";
export async function OPTIONS(r: Request) { return new Response(null, { status: 204, headers: cors(r) }); }

// A versioned, idempotent server-to-server transaction. No model call is needed
// to acknowledge captured data; reviewed desktop reports retain full evidence.
export async function POST(r: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireIngestSecret(r);
    const { id } = await params; z.string().uuid().parse(id);
    const reader=r.body?.getReader(); if(!reader) throw new Error("Missing body");
    const chunks:Uint8Array[]=[]; let count=0;
    while(true) { const {done,value}=await reader.read(); if(done)break;
      count+=value.byteLength; if(count>8*1024*1024){await reader.cancel();return Response.json({error:"Body too large"},{status:413,headers:cors(r)});} chunks.push(value); }
    const body=desktopDeliverySchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    if(body.interview_id!==id) throw new Error("Interview mismatch");
    const hash=createHash("sha256").update(JSON.stringify(body)).digest("hex");
    // Preserve original segment/channel/timestamp evidence in the receipt.
    // The existing review UI accepts unknown speakers and 4000-char turns.
    const transcript=body.segments.flatMap(s=>{
      const turns:{role:"unknown";content:string}[]=[];
      for(let i=0;i<s.content.length;i+=4000)turns.push({role:"unknown",content:s.content.slice(i,i+4000)});
      return turns;
    });
    const { data, error }=await interviewDb().rpc("ingest_desktop_delivery",{
      p_delivery_id:body.delivery_id,p_content_hash:hash,p_author_id:body.author_id,
      p_interview_id:id,p_round:body.round,p_session_id:body.session_id,p_revision:body.revision,
      p_payload:body,p_transcript:transcript,p_report:body.report,
      p_notes:body.report?desktopNotes(body.report):null,
    });
    if(error) return Response.json({error:"Could not persist delivery; retry with the same ID"},{status:503,headers:cors(r)});
    return Response.json(data,{headers:cors(r)});
  } catch(e) { return failure(e,r); }
}
