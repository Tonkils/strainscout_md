/**
 * Moderation Queue — Admin-only page for reviewing flagged/pending comments.
 * Features: filter by status, approve/reject with notes, bulk actions.
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "wouter";
import {
  Shield, CheckCircle, XCircle, Clock, AlertTriangle,
  MessageSquare, User, Flag, ChevronDown, Loader2, ArrowLeft
} from "lucide-react";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

export default function Moderation() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [moderationNote, setModerationNote] = useState<Record<number, string>>({});
  const [expandedComment, setExpandedComment] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const queryStatus = statusFilter === "all" ? undefined : statusFilter;
  const { data: comments, isLoading } = trpc.comments.moderation.useQuery(
    { status: queryStatus, limit: 50 },
    { enabled: isAuthenticated && user?.role === "admin" }
  );

  const { data: pendingCount } = trpc.comments.pendingCount.useQuery(
    undefined,
    { enabled: isAuthenticated && user?.role === "admin" }
  );

  const moderateMutation = trpc.comments.moderate.useMutation({
    onSuccess: () => {
      utils.comments.moderation.invalidate();
      utils.comments.pendingCount.invalidate();
    },
  });

  const handleModerate = (commentId: number, action: "approved" | "rejected") => {
    moderateMutation.mutate({
      commentId,
      action,
      moderationNote: moderationNote[commentId] || undefined,
    });
    setModerationNote((prev) => {
      const next = { ...prev };
      delete next[commentId];
      return next;
    });
    setExpandedComment(null);
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  };

  const statusColors: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    rejected: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  const statusIcons: Record<string, React.ReactNode> = {
    pending: <Clock className="w-3 h-3" />,
    approved: <CheckCircle className="w-3 h-3" />,
    rejected: <XCircle className="w-3 h-3" />,
  };

  // Auth gate
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16 text-center">
          <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h1 className="font-serif text-2xl text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">This page is only accessible to administrators.</p>
          <Link href="/" className="text-primary text-sm hover:underline">
            Return to Home
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mb-4 transition-colors">
            <ArrowLeft className="w-3 h-3" />
            Back to Home
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="font-serif text-2xl sm:text-3xl text-foreground">Comment Moderation</h1>
            {pendingCount !== undefined && pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium">
                {pendingCount} pending
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            Review and moderate community comments. Flagged comments require manual approval.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(["pending", "all", "approved", "rejected"] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === status
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              {status === "pending" && <Clock className="w-3 h-3 inline mr-1" />}
              {status === "all" && <MessageSquare className="w-3 h-3 inline mr-1" />}
              {status === "approved" && <CheckCircle className="w-3 h-3 inline mr-1" />}
              {status === "rejected" && <XCircle className="w-3 h-3 inline mr-1" />}
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status === "pending" && pendingCount !== undefined && pendingCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px]">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Comments List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <span className="ml-2 text-muted-foreground text-sm">Loading comments...</span>
          </div>
        ) : comments && comments.length > 0 ? (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className={`bg-card border rounded-xl p-4 sm:p-5 transition-colors ${
                  comment.flagged === "flagged"
                    ? "border-amber-500/30"
                    : "border-border/30"
                }`}
              >
                {/* Comment Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {comment.userName || `User #${comment.userId}`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      on <Link href={`/strain/${comment.strainId}`} className="text-primary hover:underline">
                        {comment.strainName}
                      </Link>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {comment.flagged === "flagged" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-medium">
                        <Flag className="w-2.5 h-2.5" />
                        Flagged
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${statusColors[comment.status]}`}>
                      {statusIcons[comment.status]}
                      {comment.status}
                    </span>
                  </div>
                </div>

                {/* Comment Content */}
                <p className="text-sm text-foreground/90 leading-relaxed mb-3 pl-8">
                  {comment.content}
                </p>

                {/* Moderation Note (if exists) */}
                {comment.moderationNote && (
                  <div className="ml-8 mb-3 px-3 py-2 bg-muted/30 border border-border/20 rounded-lg text-xs text-muted-foreground">
                    <span className="font-medium">Moderation note:</span> {comment.moderationNote}
                  </div>
                )}

                {/* Action Buttons */}
                {comment.status === "pending" && (
                  <div className="pl-8">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleModerate(comment.id, "approved")}
                        disabled={moderateMutation.isPending}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          if (expandedComment === comment.id) {
                            handleModerate(comment.id, "rejected");
                          } else {
                            setExpandedComment(comment.id);
                          }
                        }}
                        disabled={moderateMutation.isPending}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-3 h-3" />
                        Reject
                      </button>
                      <button
                        onClick={() => setExpandedComment(expandedComment === comment.id ? null : comment.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted/50 text-muted-foreground text-xs hover:text-foreground transition-colors"
                      >
                        <ChevronDown className={`w-3 h-3 transition-transform ${expandedComment === comment.id ? "rotate-180" : ""}`} />
                        Add Note
                      </button>
                    </div>

                    {/* Expanded Note Input */}
                    {expandedComment === comment.id && (
                      <div className="mt-3">
                        <input
                          type="text"
                          value={moderationNote[comment.id] || ""}
                          onChange={(e) => setModerationNote((prev) => ({ ...prev, [comment.id]: e.target.value }))}
                          placeholder="Optional moderation note (e.g., reason for rejection)..."
                          className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                          maxLength={256}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">
              {statusFilter === "pending"
                ? "No comments awaiting moderation."
                : `No ${statusFilter === "all" ? "" : statusFilter + " "}comments found.`}
            </p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
