"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Flag } from "lucide-react";
import type { StrainComment } from "@/db/schema";

export default function CommentsPage() {
  const [comments, setComments] = useState<StrainComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComment, setSelectedComment] = useState<StrainComment | null>(null);
  const [moderationNote, setModerationNote] = useState("");

  useEffect(() => {
    async function fetchComments() {
      try {
        const { data, error } = await supabase
          .from("strain_comments")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setComments(data || []);
      } catch (error) {
        console.error("Failed to fetch comments:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchComments();
  }, []);

  const statusCount = comments.reduce((acc, comment) => {
    acc[comment.status] = (acc[comment.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleModerate = async (commentId: number, status: "approved" | "rejected") => {
    try {
      const { error } = await supabase
        .from("strain_comments")
        .update({
          status,
          moderationNote: moderationNote || null,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", commentId);

      if (error) throw error;

      setComments(comments.map(c =>
        c.id === commentId ? { ...c, status, moderationNote: moderationNote || null } : c
      ));
      setSelectedComment(null);
      setModerationNote("");
    } catch (error) {
      console.error("Failed to moderate comment:", error);
      alert("Failed to update comment status");
    }
  };

  const handleFlag = async (commentId: number) => {
    try {
      const comment = comments.find(c => c.id === commentId);
      const newFlagStatus = comment?.flagged === "flagged" ? "clean" : "flagged";

      const { error } = await supabase
        .from("strain_comments")
        .update({ flagged: newFlagStatus, updatedAt: new Date().toISOString() })
        .eq("id", commentId);

      if (error) throw error;

      setComments(comments.map(c =>
        c.id === commentId ? { ...c, flagged: newFlagStatus as "clean" | "flagged" } : c
      ));
    } catch (error) {
      console.error("Failed to flag comment:", error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Comment Moderation</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-muted rounded"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Comment Moderation</h1>
        <p className="text-muted-foreground mt-1">{comments.length} total comments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCount.pending || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCount.approved || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCount.rejected || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Flagged</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {comments.filter(c => c.flagged === "flagged").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Comments</CardTitle>
          <CardDescription>Review and moderate user-submitted strain comments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Strain</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No comments found
                    </TableCell>
                  </TableRow>
                ) : (
                  comments.map((comment) => (
                    <TableRow key={comment.id} className={comment.flagged === "flagged" ? "bg-red-50" : ""}>
                      <TableCell className="font-medium">
                        {comment.userName || `User ${comment.userId}`}
                      </TableCell>
                      <TableCell>{comment.strainName}</TableCell>
                      <TableCell className="max-w-md">
                        <div className="line-clamp-2">{comment.content}</div>
                        {comment.moderationNote && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Note: {comment.moderationNote}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              comment.status === "approved"
                                ? "default"
                                : comment.status === "rejected"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {comment.status}
                          </Badge>
                          {comment.flagged === "flagged" && (
                            <Badge variant="destructive">
                              <Flag className="h-3 w-3" />
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {comment.status === "pending" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedComment(comment)}
                              >
                                Review
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleFlag(comment.id)}
                              >
                                <Flag className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {comment.status !== "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFlag(comment.id)}
                            >
                              <Flag className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedComment && (
        <Card>
          <CardHeader>
            <CardTitle>Review Comment</CardTitle>
            <CardDescription>
              Comment by {selectedComment.userName || `User ${selectedComment.userId}`} on {selectedComment.strainName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p>{selectedComment.content}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Moderation Note (optional)</label>
              <Textarea
                value={moderationNote}
                onChange={(e) => setModerationNote(e.target.value)}
                placeholder="Add a note about why this was approved/rejected..."
                rows={3}
              />
            </div>

            <div className="flex items-center gap-4">
              <Button
                onClick={() => handleModerate(selectedComment.id, "approved")}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                onClick={() => handleModerate(selectedComment.id, "rejected")}
                variant="destructive"
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={() => {
                  setSelectedComment(null);
                  setModerationNote("");
                }}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
