import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Review {
  id: string;
  client_id: string | null;
  rating: number;
  comment: string;
  created_at: string;
}

export function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchReviews(); }, []);

  const fetchReviews = async () => {
    setLoading(true);
    const { data } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
    if (data) setReviews(data as Review[]);
    setLoading(false);
  };

  const avgRating = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : '—';

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <svg key={i} className={`w-4 h-4 ${i < rating ? 'text-yellow-400' : 'text-neutral-600'}`} fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  if (loading) {
    return <div className="text-neutral-400 p-8 flex justify-center items-center h-64"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Reviews & Feedback</h1>
          <p className="text-neutral-400 text-sm mt-1">Monitor your online reputation</p>
        </div>
        <button onClick={fetchReviews} className="text-sm bg-neutral-800 hover:bg-neutral-700 text-white py-2 px-4 rounded border border-neutral-700 transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-neutral-800 border border-neutral-700 p-6 rounded-lg">
          <h3 className="text-neutral-400 text-sm font-medium mb-2">Average Rating</h3>
          <div className="flex items-center gap-3">
            <p className="text-3xl font-bold text-white">{avgRating}</p>
            <div className="flex">{reviews.length > 0 && renderStars(Math.round(Number(avgRating)))}</div>
          </div>
        </div>
        <div className="bg-neutral-800 border border-neutral-700 p-6 rounded-lg">
          <h3 className="text-neutral-400 text-sm font-medium mb-2">Total Reviews</h3>
          <p className="text-3xl font-bold text-white">{reviews.length}</p>
        </div>
        <div className="bg-neutral-800 border border-neutral-700 p-6 rounded-lg">
          <h3 className="text-neutral-400 text-sm font-medium mb-2">5-Star Reviews</h3>
          <p className="text-3xl font-bold text-white">{reviews.filter(r => r.rating === 5).length}</p>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-12 text-center">
          <div className="text-neutral-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>
          </div>
          <h3 className="text-xl text-white font-medium mb-2">No reviews yet</h3>
          <p className="text-neutral-400">Reviews from customers will appear here once submitted.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => (
            <div key={review.id} className="bg-neutral-800 border border-neutral-700 rounded-lg p-5 hover:border-neutral-600 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex">{renderStars(review.rating)}</div>
                <span className="text-neutral-500 text-sm ml-2">{new Date(review.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-neutral-200">{review.comment || <span className="text-neutral-600 italic">No comment provided</span>}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
