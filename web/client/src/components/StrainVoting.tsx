import { useState, useMemo } from "react";
import { ThumbsUp, ThumbsDown, MessageSquare, Loader2, LogIn, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trackStrainVoted } from "@/lib/analytics";

interface StrainVotingProps {
  strainId: string;
  strainName: string;
}

type VoteDimension = "effectsAccuracy" | "valueForMoney" | "overallQuality";

const DIMENSIONS: { key: VoteDimension; label: string; description: string }[] = [
  { key: "effectsAccuracy", label: "Effects Accuracy", description: "Do the listed effects match your experience?" },
  { key: "valueForMoney", label: "Value for Money", description: "Is this strain worth the price?" },
  { key: "overallQuality", label: "Overall Quality", description: "How would you rate the overall quality?" },
];

export default function StrainVoting({ strainId, strainName }: StrainVotingProps) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  // Fetch aggregate data (public)
  const { data: aggregates, isLoading: aggLoading } = trpc.votes.aggregates.useQuery({ strainId });

  // Fetch user's existing vote (if logged in)
  const { data: myVote, isLoading: myVoteLoading } = trpc.votes.myVote.useQuery(
    { strainId },
    { enabled: isAuthenticated }
  );

  // Fetch comments (public)
  const { data: comments } = trpc.votes.comments.useQuery({ strainId });

  // Local vote state
  const [votes, setVotes] = useState<Record<VoteDimension, 1 | -1 | null>>({
    effectsAccuracy: null,
    valueForMoney: null,
    overallQuality: null,
  });
  const [comment, setComment] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Sync local state with existing vote
  const hasExistingVote = !!myVote;
  useMemo(() => {
    if (myVote && !isEditing) {
      setVotes({
        effectsAccuracy: myVote.effectsAccuracy as 1 | -1,
        valueForMoney: myVote.valueForMoney as 1 | -1,
        overallQuality: myVote.overallQuality as 1 | -1,
      });
      setComment(myVote.comment || "");
    }
  }, [myVote, isEditing]);

  // Submit mutation
  const submitVote = trpc.votes.submit.useMutation({
    onSuccess: (result) => {
      utils.votes.aggregates.invalidate({ strainId });
      utils.votes.myVote.invalidate({ strainId });
      utils.votes.comments.invalidate({ strainId });
      setIsEditing(false);
      // Track analytics
      if (votes.effectsAccuracy && votes.valueForMoney && votes.overallQuality) {
        trackStrainVoted(
          strainId,
          strainName,
          votes.effectsAccuracy,
          votes.valueForMoney,
          votes.overallQuality,
          comment.trim().length > 0,
          !result.isNew
        );
      }
    },
  });

  // Delete mutation
  const deleteVote = trpc.votes.delete.useMutation({
    onSuccess: () => {
      utils.votes.aggregates.invalidate({ strainId });
      utils.votes.myVote.invalidate({ strainId });
      utils.votes.comments.invalidate({ strainId });
      setVotes({ effectsAccuracy: null, valueForMoney: null, overallQuality: null });
      setComment("");
      setIsEditing(false);
    },
  });

  const allVotesSelected = votes.effectsAccuracy !== null && votes.valueForMoney !== null && votes.overallQuality !== null;

  const handleVote = (dimension: VoteDimension, value: 1 | -1) => {
    if (hasExistingVote && !isEditing) {
      setIsEditing(true);
    }
    setVotes(prev => ({
      ...prev,
      [dimension]: prev[dimension] === value ? null : value,
    }));
  };

  const handleSubmit = () => {
    if (!allVotesSelected) return;
    submitVote.mutate({
      strainId,
      strainName,
      effectsAccuracy: votes.effectsAccuracy!,
      valueForMoney: votes.valueForMoney!,
      overallQuality: votes.overallQuality!,
      comment: comment.trim() || undefined,
    });
  };

  const handleDelete = () => {
    if (confirm("Remove your vote for this strain?")) {
      deleteVote.mutate({ strainId });
    }
  };

  const commentCount = comments?.length ?? 0;

  return (
    <div className="space-y-4">
      {/* Aggregate Display */}
      {aggregates && aggregates.totalVotes > 0 && (
        <div className="bg-card/60 border border-border/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Community Ratings</h3>
            <span className="text-xs text-muted-foreground">
              {aggregates.totalVotes} vote{aggregates.totalVotes !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="space-y-3">
            {DIMENSIONS.map(dim => {
              const agg = aggregates[dim.key];
              return (
                <div key={dim.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{dim.label}</span>
                    <span className="text-xs font-medium text-foreground">
                      {agg.upPercent}% positive
                    </span>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden bg-muted/30">
                    {agg.up > 0 && (
                      <div
                        className="bg-emerald-500 transition-all duration-500"
                        style={{ width: `${agg.upPercent}%` }}
                      />
                    )}
                    {agg.down > 0 && (
                      <div
                        className="bg-red-400 transition-all duration-500"
                        style={{ width: `${100 - agg.upPercent}%` }}
                      />
                    )}
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[10px] text-emerald-400">{agg.up} 👍</span>
                    <span className="text-[10px] text-red-400">{agg.down} 👎</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Vote Submission */}
      <div className="bg-card/60 border border-border/30 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-foreground mb-1">
          {hasExistingVote && !isEditing ? "Your Vote" : "Rate This Strain"}
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          {hasExistingVote && !isEditing
            ? "You've already voted. Click a thumb to edit."
            : "Tap thumbs up or down for each dimension."}
        </p>

        {!isAuthenticated ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">Sign in to rate this strain</p>
            <a
              href={getLoginUrl()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Sign In to Vote
            </a>
          </div>
        ) : myVoteLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {DIMENSIONS.map(dim => (
              <div key={dim.key} className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-foreground">{dim.label}</span>
                  <p className="text-[10px] text-muted-foreground">{dim.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVote(dim.key, 1)}
                    className={`p-2 rounded-lg border transition-all ${
                      votes[dim.key] === 1
                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                        : "border-border/30 text-muted-foreground hover:border-emerald-500/30 hover:text-emerald-400"
                    }`}
                    aria-label={`Thumbs up for ${dim.label}`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleVote(dim.key, -1)}
                    className={`p-2 rounded-lg border transition-all ${
                      votes[dim.key] === -1
                        ? "bg-red-500/20 border-red-500/50 text-red-400"
                        : "border-border/30 text-muted-foreground hover:border-red-500/30 hover:text-red-400"
                    }`}
                    aria-label={`Thumbs down for ${dim.label}`}
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Comment input */}
            <div className="pt-2 border-t border-border/20">
              <label className="text-xs text-muted-foreground block mb-1">
                Optional comment ({140 - comment.length} chars left)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 140))}
                placeholder="Share a brief thought about this strain..."
                className="w-full bg-background/50 border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
                rows={2}
                maxLength={140}
              />
            </div>

            {/* Submit / Delete buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSubmit}
                disabled={!allVotesSelected || submitVote.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitVote.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                {hasExistingVote ? "Update Vote" : "Submit Vote"}
              </button>
              {hasExistingVote && (
                <button
                  onClick={handleDelete}
                  disabled={deleteVote.isPending}
                  className="p-2.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                  aria-label="Delete vote"
                >
                  {deleteVote.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>

            {submitVote.isSuccess && (
              <p className="text-xs text-emerald-400 text-center">
                {hasExistingVote ? "Vote updated!" : "Thanks for voting!"}
              </p>
            )}
            {submitVote.isError && (
              <p className="text-xs text-red-400 text-center">
                Failed to submit vote. Please try again.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Comments Section */}
      {commentCount > 0 && (
        <div className="bg-card/60 border border-border/30 rounded-lg p-4">
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">
                Community Comments ({commentCount})
              </span>
            </div>
            {showComments ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {showComments && comments && (
            <div className="mt-3 space-y-3">
              {comments.map(c => {
                const positiveCount = [c.effectsAccuracy, c.valueForMoney, c.overallQuality].filter(v => v === 1).length;
                const sentiment = positiveCount >= 2 ? "positive" : positiveCount <= 1 ? "negative" : "mixed";
                return (
                  <div key={c.id} className="border-t border-border/20 pt-3 first:border-0 first:pt-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        sentiment === "positive" ? "bg-emerald-500/15 text-emerald-400" :
                        sentiment === "negative" ? "bg-red-500/15 text-red-400" :
                        "bg-amber-500/15 text-amber-400"
                      }`}>
                        {sentiment === "positive" ? "👍 Positive" : sentiment === "negative" ? "👎 Negative" : "🤷 Mixed"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90">{c.comment}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
