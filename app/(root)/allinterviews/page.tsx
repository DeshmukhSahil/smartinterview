import { supabase } from '@/lib/supabase';
import InterviewCard from '@/components/InterviewCard';

async function getInterviewsFromDB() {
  try {
    const { data, error } = await supabase
      .from('interviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return [];
    
    return data.map((doc: any) => ({
      id: doc.id,
      ...doc,
      createdAt: doc.created_at, // mapping snake_case to camelCase
    })) as Interview[];
  } catch (error) {
    console.log("Database not configured, returning mock data");
    return [];
  }
}

export default async function AllInterviewsPage() {
  const interviews = await getInterviewsFromDB();

  return (
    <div className="max-w-6xl mx-auto px-4">
      <h1 className="text-5xl font-bold text-center mb-6 p-6">All Interviews</h1>

      {/* Server-side rendered list */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {interviews.map((interview) => (
          <InterviewCard
            key={interview.id}
            interviewId={interview.id}
            role={interview.role}
            type={interview.type}
            techstack={interview.techstack}
            createdAt={interview.createdAt}
          />
        ))}
      </div>
    </div>
  );
}
