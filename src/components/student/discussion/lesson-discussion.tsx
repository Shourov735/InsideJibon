"use client";

import { useState } from "react";
import { addCommentAction, deleteCommentAction } from "@/app/student/actions/comment-actions";
import type { LessonCommentItem } from "@/services/learning/comments";

export function LessonDiscussion({ 
  lessonId, 
  courseId,
  comments,
  currentUserId 
}: { 
  lessonId: string;
  courseId: string;
  comments: LessonCommentItem[];
  currentUserId: string;
}) {
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const content = formData.get("content") as string;
    
    if (!content || !content.trim()) return;
    setLoading(true);
    try {
      await addCommentAction({ lessonId, content, courseId });
      form.reset();
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (commentId: string) => {
    if (!confirm("Delete comment?")) return;
    try {
      await deleteCommentAction({ commentId, courseId });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <textarea
          name="content"
          required
          className="w-full min-h-[100px] p-3 rounded-md border border-outline-variant bg-surface-container-lowest focus:ring-2 focus:ring-primary outline-none"
          placeholder="Add to the discussion..."
        />
        <button 
          type="submit" 
          disabled={loading}
          className="px-4 py-2 bg-primary text-on-primary rounded-md disabled:opacity-50"
        >
          {loading ? "Posting..." : "Post Comment"}
        </button>
      </form>

      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="p-4 rounded-lg bg-surface-container-lowest border border-outline-variant">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {(comment.userName || "U").charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-sm">{comment.userName || "User"}</div>
                  <div className="text-xs text-secondary">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              {comment.userId === currentUserId && (
                <button
                  onClick={() => onDelete(comment.id)}
                  className="text-xs text-error hover:underline"
                >
                  Delete
                </button>
              )}
            </div>
            <div className="mt-3 text-sm text-on-surface whitespace-pre-wrap">
              {comment.content}
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <div className="text-center text-secondary text-sm py-8">
            No comments yet. Be the first to start the discussion!
          </div>
        )}
      </div>
    </div>
  );
}
