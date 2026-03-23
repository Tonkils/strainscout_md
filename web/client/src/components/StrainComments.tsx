/**
 * StrainComments — Comment submission form + approved comments display.
 * Integrates with trpc.comments.submit, trpc.comments.list, trpc.comments.delete.
 * Login-gated submission, public display.
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { MessageSquare, Send, Trash2, LogIn, AlertCircle, CheckCircle, Clock, User } from "lucide-react";
import { trackCommentSubmitted } from "@/lib/analytics";

interface StrainCommentsProps {
  strainId: string;
  strainName: string;
}

export default function StrainComments({ strainId, strainName }: StrainCommentsProps) {
  const { user, isAuthenticated } = useAuth();
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ status: string; message: string } | null>(null);

  const utils = trpc.useUtils();

  const { data: comments, isLoading } = trpc.comments.list.useQuery(
    { strainId, limit: 20 },
  );

  const { data: commentCount } = trpc.comments.count.useQuery({ strainId });

  const submitMutation = trpc.comments.submit.useMutation({
    onSuccess: (result) => {
      trackCommentSubmitted(strainId, strainName, result.flagged, content.trim().length);
      setContent("");
      setSubmitResult({ status: result.status, message: result.message });
      utils.comments.list.invalidate({ strainId });
      utils.comments.count.invalidate({ strainId });
      setTimeout(() => setSubmitResult(null), 5000);
    },
    onError: (error) => {
      setSubmitResult({ status: "error", message: error.message });
      setTimeout(() => setSubmitResult(null), 5000);
    },
    onSettled: () => setSubmitting(false),
  });

  const deleteMutation = trpc.comments.delete.useMutation({
    onSuccess: () => {
      utils.comments.list.invalidate({ strainId });
      utils.comments.count.invalidate({ strainId });
    },
  });

  const handleSubmit = () => {
    if (!content.trim() || content.trim().length < 10) return;
    setSubmitting(true);
    submitMutation.mutate({ strainId, strainName, content: content.trim() });
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="bg-card border border-border/30 rounded-xl p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h3 className="font-serif text-lg text-foreground">Community Reviews</h3>
        </div>
        {commentCount !== undefined && commentCount > 0 && (
          <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
            {commentCount} review{commentCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Submit Form */}
      {isAuthenticated ? (
        <div className="mb-6">
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 1000))}
              placeholder={`Share your experience with ${strainName}...`}
              className="w-full bg-background border border-border/50 rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none min-h-[80px]"
              rows={3}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">
                {content.length}/1000 characters (min 10)
              </span>
              <button
                onClick={handleSubmit}
                disabled={submitting || content.trim().length < 10}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-3 h-3" />
                {submitting ? "Posting..." : "Post Review"}
              </button>
            </div>
          </div>

          {/* Submit Result Message */}
          {submitResult && (
            <div className={`flex items-center gap-2 mt-3 px-3 py-2 rounded-lg text-xs ${
              submitResult.status === "approved"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : submitResult.status === "pending"
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}>
              {submitResult.status === "approved" ? (
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              ) : submitResult.status === "pending" ? (
                <Clock className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              )}
              {submitResult.message}
            </div>
          )}
        </div>
      ) : (
        <div className="mb-6 p-4 bg-muted/30 border border-border/30 rounded-lg text-center">
          <p className="text-sm text-muted-foreground mb-2">Sign in to share your review</p>
          <a
            href={getLoginUrl()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <LogIn className="w-3 h-3" />
            Sign In
          </a>
        </div>
      )}

      {/* Comments List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-muted/50 rounded w-1/3 mb-2" />
              <div className="h-3 bg-muted/30 rounded w-full mb-1" />
              <div className="h-3 bg-muted/30 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : comments && comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="group border-b border-border/20 pb-4 last:border-0 last:pb-0">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-xs font-medium text-foreground">
                    {comment.userName || "Anonymous"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(comment.createdAt)}
                  </span>
                </div>
                {/* Delete button for own comments */}
                {user && user.id === comment.userId && (
                  <button
                    onClick={() => {
                      if (confirm("Delete your review?")) {
                        deleteMutation.mutate({ commentId: comment.id });
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-red-400 transition-all"
                    title="Delete your review"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed pl-8">
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No reviews yet. Be the first to share your experience!</p>
        </div>
      )}
    </div>
  );
}
