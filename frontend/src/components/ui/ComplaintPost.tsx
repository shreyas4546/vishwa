"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Heart, 
  MessageSquare, 
  Share2, 
  Coins, 
  Bot, 
  MapPin, 
  ShieldCheck, 
  AlertTriangle,
  User,
  ArrowRight,
  Check,
  Send
} from "lucide-react";
import type { Complaint } from "@/lib/types";
import { CATEGORIES, PRIORITIES } from "@/lib/constants";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { useI18n } from "@/lib/i18n/I18nContext";

interface ComplaintPostProps {
  complaint: Complaint;
  onVote: (id: string) => void;
  onDonate: (id: string, amount: number) => void;
}

export function ComplaintPost({ complaint, onVote, onDonate }: ComplaintPostProps) {
  const [isVoting, setIsVoting] = useState(false);
  const [showDonate, setShowDonate] = useState(false);
  const [donateAmount, setDonateAmount] = useState<number>(500);
  
  // Local state for Comments & Sharing (no backend)
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [comments, setComments] = useState<{text: string; date: Date}[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  
  const { t } = useI18n();

  const category = CATEGORIES.find((c) => c.id === complaint.category);
  const priority = PRIORITIES.find((p) => p.id === complaint.priority);
  const isEscalated = complaint.communityVotes >= 50 || (complaint.escalationLevel && complaint.escalationLevel > 0) || complaint.status === 'action_taken' || complaint.status === 'resolved' || complaint.priority === 'critical';

  const handleVote = () => {
    setIsVoting(true);
    onVote(complaint.id);
    setTimeout(() => setIsVoting(false), 500);
  };

  const handleDonate = () => {
    onDonate(complaint.id, donateAmount);
    setShowDonate(false);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/processing?id=${complaint.id}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSubmitReply = () => {
    if (!replyText.trim()) return;
    setComments([...comments, { text: replyText.trim(), date: new Date() }]);
    setReplyText("");
  };

  return (
    <motion.article 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-border rounded-2xl p-4 sm:p-6 mb-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
    >
      {/* Top Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-bg-surface flex items-center justify-center border border-border">
            <User size={20} className="text-text-secondary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-text-primary">
                {complaint.reportingMode === "anonymous" ? t("post.anonymous") || "Anonymous Citizen" : t("post.verified") || "Verified Citizen"}
              </span>
              {complaint.reportingMode !== "anonymous" && (
                <ShieldCheck size={14} className="text-accent" />
              )}
            </div>
            <div className="text-xs text-text-secondary flex items-center gap-2">
              <span>{formatDistanceToNow(new Date(complaint.createdAt))} ago</span>
              {complaint.location && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin size={12} />
                    {complaint.location}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <Badge variant={priority?.id === "critical" ? "danger" : "default"}>
          {category?.label}
        </Badge>
      </div>

      {/* Content */}
      <div className="mb-4">
        <p className="text-text-primary text-base sm:text-lg leading-relaxed mb-3">
          {complaint.rawText}
        </p>
        
        {/* Actual Uploaded Media */}
        {complaint.mediaUrls && complaint.mediaUrls.length > 0 ? (
          <div className={`grid gap-2 mb-4 ${complaint.mediaUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {complaint.mediaUrls.map((url, idx) => (
              <div key={idx} className="w-full h-48 bg-bg-surface rounded-xl border border-border flex items-center justify-center overflow-hidden">
                <img src={url} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        ) : complaint.category === "roads" ? (
          <div className="w-full h-48 bg-bg-surface rounded-xl border border-border flex items-center justify-center mb-4 overflow-hidden">
            <img src="/sectors/roads.png" alt="Pothole" className="w-full h-full object-cover opacity-80" />
          </div>
        ) : null}
      </div>

      {/* AI Routing Tag */}
      <AnimatePresence>
        {isEscalated ? (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-4 bg-accent/5 border border-accent/20 rounded-xl p-3 flex items-start gap-3"
          >
            <Bot size={20} className="text-accent mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-1 flex items-center gap-2">
                {complaint.priority === 'critical' ? 'CRITICAL ALERT - ROUTED' : t("comm.post.routed")}
                {complaint.aiConfidence !== undefined && (
                  <Badge variant="accent" size="sm">{(complaint.aiConfidence * 100).toFixed(0)}% Match</Badge>
                )}
              </p>
              <p className="text-sm text-text-primary">
                {t("post.sentTo") || "Sent to:"} <span className="font-medium">{complaint.routedTo}</span> ({complaint.department})
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="mb-4 bg-warning/5 border border-warning/20 rounded-xl p-3 flex items-start gap-3">
            <AlertTriangle size={20} className="text-warning mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-warning uppercase tracking-wider mb-1">
                {t("comm.post.pending")}
              </p>
              <p className="text-sm text-text-secondary">
                Needs {50 - complaint.communityVotes} {t("post.needsVotes") || "more votes to automatically alert the authorities."}
              </p>
              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-border rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-warning transition-all duration-500"
                  style={{ width: `${Math.min(100, (complaint.communityVotes / 50) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Funding Progress (if target exists) */}
      {complaint.targetAmount! > 0 && (
        <div className="mb-4 px-4 py-3 bg-[#8b5a2b]/5 border border-[#8b5a2b]/20 rounded-xl">
          <div className="flex justify-between text-xs font-semibold text-[#8b5a2b] mb-2 uppercase tracking-wider">
            <span>{t("post.communityFund") || "Community Fund"}</span>
            <span>₹{(complaint.amountRaised || 0).toLocaleString()} / ₹{complaint.targetAmount?.toLocaleString()}</span>
          </div>
          <div className="w-full h-2 bg-border rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#8b5a2b] transition-all duration-1000"
              style={{ width: `${Math.min(100, ((complaint.amountRaised || 0) / complaint.targetAmount!) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-4 border-t border-border/60">
        <div className="flex items-center gap-4 sm:gap-6">
          <button 
            onClick={handleVote}
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${isVoting ? 'text-rose-500 scale-110' : 'text-text-secondary hover:text-rose-500'}`}
          >
            <Heart size={20} className={complaint.communityVotes > 0 ? "fill-rose-100" : ""} />
            <span>{complaint.communityVotes}</span>
          </button>
          <button 
            onClick={() => setShowReply(!showReply)}
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${showReply ? 'text-accent' : 'text-text-secondary hover:text-accent'}`}
          >
            <MessageSquare size={20} />
            <span>{comments.length > 0 ? comments.length : t("comm.post.reply")}</span>
          </button>
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-accent transition-colors"
          >
            {isCopied ? <Check size={20} className="text-success" /> : <Share2 size={20} />}
            <span className={isCopied ? "text-success" : ""}>{isCopied ? "Copied!" : "Share"}</span>
          </button>
        </div>

        {/* Donate Button */}
        {complaint.targetAmount! > 0 && (
          <div className="relative">
            <Button 
              size="sm" 
              variant="outline" 
              className="text-[#8b5a2b] border-[#8b5a2b]/30 hover:bg-[#8b5a2b] hover:text-white"
              onClick={() => setShowDonate(!showDonate)}
            >
              <Coins size={16} className="mr-2" />
              {t("comm.post.boost") || "Fund Cause"}
            </Button>

            <AnimatePresence>
              {showDonate && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-full right-0 mb-2 w-80 sm:w-96 bg-white border border-border shadow-xl rounded-xl p-4 z-10"
                >
                  <h4 className="text-sm font-bold text-text-primary mb-1">Support this Cause</h4>
                  
                  {complaint.qrCodeUrl && (
                    <div className="my-3 flex justify-center p-2 bg-bg-surface rounded-lg border border-border">
                      <img src={complaint.qrCodeUrl} alt="Donate QR Code" className="w-full max-h-72 object-contain rounded-md" />
                    </div>
                  )}

                  <p className="text-xs text-text-secondary mb-3">Scan the QR to donate directly. Note: {complaint.commission || 5}% of your donation goes to the platform as an administrative commission.</p>
                  
                  <div className="mb-3">
                    <label className="text-xs text-text-muted uppercase tracking-wide block mb-1">Enter Donated Amount (₹)</label>
                    <input 
                      type="number"
                      value={donateAmount || ""}
                      onChange={(e) => setDonateAmount(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full bg-bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8b5a2b]"
                      placeholder="e.g. 500"
                    />
                  </div>
                  <Button size="sm" className="w-full bg-[#8b5a2b] hover:bg-[#6b4421] text-white" onClick={handleDonate} disabled={!donateAmount || donateAmount <= 0}>
                    I have donated ₹{donateAmount || 0}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Reply / Comment Section (Local State) */}
      <AnimatePresence>
        {showReply && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-border mt-4 pt-4"
          >
            {comments.length > 0 && (
              <div className="space-y-3 mb-4 max-h-40 overflow-y-auto hide-scrollbar">
                {comments.map((comment, i) => (
                  <div key={i} className="flex gap-3 bg-bg-surface p-3 rounded-xl border border-border">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                      <User size={14} className="text-accent" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-text-primary">You</span>
                        <span className="text-[10px] text-text-muted">{formatDistanceToNow(comment.date)} ago</span>
                      </div>
                      <p className="text-sm text-text-secondary">{comment.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                placeholder="Write a comment..." 
                className="flex-1 bg-bg-surface border border-border rounded-full px-4 py-2 text-sm focus:outline-none focus:border-accent text-text-primary"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitReply()}
              />
              <button 
                onClick={handleSubmitReply}
                disabled={!replyText.trim()}
                className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent-hover transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
