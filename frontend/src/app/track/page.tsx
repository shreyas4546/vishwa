"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  AlertTriangle,
  Send,
  CheckCircle2,
  UserCheck,
  Hammer,
  CircleCheckBig,
  Clock,
  TrendingUp,
  ShieldAlert,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Timeline, type TimelineStep } from "@/components/ui/Timeline";
import { complaintService } from "@/services/complaintService";
import { communityService } from "@/services/communityService";
import { mapApiComplaintToFrontend } from "@/lib/apiTransformers";
import { formatDateTime, getPriorityConfig, getEscalationLevel } from "@/lib/utils";
import { CATEGORIES, ESCALATION_LABELS } from "@/lib/constants";
import type { Complaint, ComplaintStatus } from "@/lib/types";
import { useI18n } from "@/lib/i18n/I18nContext";

/* ============================================
   STATUS ICON MAP
   ============================================ */

const STATUS_ICONS: Record<ComplaintStatus, React.ReactNode> = {
  submitted: <Send size={16} />,
  verified: <CheckCircle2 size={16} />,
  assigned: <UserCheck size={16} />,
  under_review: <Search size={16} />,
  action_taken: <Hammer size={16} />,
  resolved: <CircleCheckBig size={16} />,
  rejected: <X size={16} />,
};

/* ============================================
   TRACKING PAGE CONTENT — API Connected
   ============================================ */

function TrackingContent() {
  const searchParams = useSearchParams();
  const [complaintId, setComplaintId] = useState(searchParams.get("id") || "");
  const [pin, setPin] = useState(searchParams.get("pin") || "");
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const { t } = useI18n();

  /* Auto-search if params present */
  useState(() => {
    const id = searchParams.get("id");
    const p = searchParams.get("pin");
    if (id) {
      handleSearchWithParams(id, p || "");
    }
  });

  async function handleSearchWithParams(id: string, p: string) {
    setIsSearching(true);
    setSearched(true);
    setError("");
    try {
      const result = await complaintService.track(id, p || undefined);
      if (result?.complaint) {
        const mapped = mapApiComplaintToFrontend(result.complaint, result.timeline);
        if (p && !mapped.pin) mapped.pin = p;
        setComplaint(mapped);
      } else {
        setError("No complaint found. Check your ID and PIN.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to track complaint.");
      setComplaint(null);
    } finally {
      setIsSearching(false);
    }
  }

  const handleSearch = () => {
    if (!complaintId.trim()) {
      setError("Please enter a Complaint ID");
      return;
    }
    handleSearchWithParams(complaintId.trim(), pin.trim());
  };

  const handleVote = async () => {
    if (!complaint?._apiId) return;
    setIsVoting(true);
    try {
      await communityService.vote(complaint._apiId);
      setComplaint((prev) => prev ? { ...prev, communityVotes: prev.communityVotes + 1 } : null);
    } catch {
      alert("You may have already voted on this complaint.");
    } finally {
      setIsVoting(false);
    }
  };

  const escalationLevel = complaint
    ? getEscalationLevel(complaint.createdAt, complaint.status)
    : 0;

  const priorityConfig = complaint ? getPriorityConfig(complaint.priority) : null;
  const categoryConfig = complaint
    ? CATEGORIES.find((c) => c.id === complaint.category)
    : null;

  /* Build timeline steps */
  const buildTimelineSteps = (c: Complaint): TimelineStep[] => {
    const allStatuses: ComplaintStatus[] = [
      "submitted",
      "verified",
      "assigned",
      "under_review",
      "action_taken",
      "resolved",
      "rejected",
    ];

    const statusLabels: Record<ComplaintStatus, string> = {
      submitted: "Complaint Submitted",
      verified: "Community Verified",
      assigned: "Assigned to Official",
      under_review: "Under Review",
      action_taken: "Action Taken",
      resolved: "Resolved",
      rejected: "Rejected",
    };

    const currentIndex = allStatuses.indexOf(c.status);

    return allStatuses.map((status, i) => {
      const timelineEvent = c.timeline.find((t) => t.status === status);
      const isCurrent = i === currentIndex;
      const isCompleted = i < currentIndex;

      return {
        id: status,
        label: statusLabels[status],
        description: timelineEvent?.note || undefined,
        timestamp: timelineEvent ? formatDateTime(timelineEvent.timestamp) : undefined,
        icon: STATUS_ICONS[status],
        status: isCompleted ? "completed" : isCurrent ? "active" : "pending",
      };
    });
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-2">
            {t("track.title")}
          </h1>
          <p className="text-text-secondary">
            {t("track.subtitle")}
          </p>
        </motion.div>

        {/* Search form */}
        <Card variant="glass" padding="lg" className="mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                inputSize="lg"
                placeholder="Complaint ID (e.g. NV-2026-XK92R)"
                value={complaintId}
                onChange={(e) => setComplaintId(e.target.value.toUpperCase())}
                icon={<Search size={18} />}
                className="flex-1"
              />
            </div>
            <Input
              inputSize="lg"
              placeholder="6-digit PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              type="password"
              maxLength={6}
              className="w-full sm:w-36"
            />
            <Button size="lg" onClick={handleSearch} loading={isSearching} icon={<Search size={18} />}>
              Track
            </Button>
          </div>
          {error && (
            <p className="text-sm text-danger mt-3 flex items-center gap-1">
              <AlertTriangle size={14} /> {error}
            </p>
          )}
        </Card>

        {/* Results */}
        {searched && complaint && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Status header */}
            <Card variant="solid" padding="lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-mono text-sm text-text-muted">{complaint.id}</p>
                  <h2 className="text-lg font-semibold mt-1">
                    {categoryConfig?.label || complaint.category} Complaint
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {priorityConfig && (
                    <Badge
                      variant={
                        priorityConfig.id === "critical"
                          ? "danger"
                          : priorityConfig.id === "high"
                          ? "warning"
                          : "accent"
                      }
                      size="md"
                      pulse={priorityConfig.id === "critical"}
                    >
                      {priorityConfig.label}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-bg-primary border border-border">
                <p className="text-sm text-text-primary leading-relaxed">
                  {complaint.summary || complaint.rawText}
                </p>
              </div>

              <div className="flex items-center gap-4 mt-3 text-xs text-text-muted">
                <span className="flex items-center gap-1">
                  <Clock size={12} /> Filed: {formatDateTime(complaint.createdAt)}
                </span>
                {complaint.affectedPeople && (
                  <span className="flex items-center gap-1">
                    <TrendingUp size={12} /> {complaint.affectedPeople} affected
                  </span>
                )}
              </div>
            </Card>

            {/* Escalation banner */}
            {escalationLevel > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Card variant="outline" padding="md" className="border-warning/40 bg-warning/5">
                  <div className="flex items-start gap-3">
                    <ShieldAlert size={20} className="text-warning mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-warning text-sm">
                        Escalation Level {escalationLevel}
                      </p>
                      <p className="text-xs text-text-secondary mt-1">
                        This complaint has been escalated to: {ESCALATION_LABELS[escalationLevel - 1]}.
                        Insufficient response triggers automatic escalation to ensure accountability.
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Timeline */}
            <Card variant="solid" padding="lg">
              <h3 className="font-semibold mb-6 flex items-center gap-2">
                <Clock size={18} className="text-accent" />
                Complaint Timeline
              </h3>
              <Timeline steps={buildTimelineSteps(complaint)} />
            </Card>

            {/* Proof of action */}
            {complaint.proofOfAction.length > 0 && (
              <Card variant="solid" padding="lg">
                <h3 className="font-semibold mb-4">Proof of Action</h3>
                <div className="space-y-3">
                  {complaint.proofOfAction.map((proof) => (
                    <div
                      key={proof.id}
                      className="p-3 rounded-xl bg-bg-primary border border-border"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge
                          variant={proof.type === "after" ? "success" : "default"}
                          size="sm"
                        >
                          {proof.type === "before" ? "📸 Before" : proof.type === "after" ? "✅ After" : "📝 Note"}
                        </Badge>
                        <span className="text-xs text-text-muted">
                          {formatDateTime(proof.uploadedAt)}
                        </span>
                      </div>
                      <p className="text-sm text-text-primary">{proof.note}</p>
                      <p className="text-xs text-text-muted mt-1">By: {proof.uploadedBy}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Community Validation & Support */}
            <Card variant="outline" padding="lg" className="border-accent/20 bg-bg-surface/50">
              <div className="flex flex-col sm:flex-row gap-6">
                
                {/* Genuineness Score */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldAlert size={18} className="text-accent" />
                    <span className="text-sm font-medium">Genuineness Score</span>
                  </div>
                  <div className="flex items-end gap-3 mb-2">
                    <span className="font-display text-4xl font-bold text-accent">
                      {complaint.genuinenessScore || 0}%
                    </span>
                    <span className="text-sm text-text-secondary mb-1">Confidence</span>
                  </div>
                  <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-accent"
                      initial={{ width: 0 }}
                      animate={{ width: `${complaint.genuinenessScore || 0}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                  <p className="text-xs text-text-muted mt-2">
                    Score based on validator endorsements and community consensus.
                  </p>
                </div>

                {/* Vertical Divider */}
                <div className="hidden sm:block w-px bg-border" />

                {/* Community Votes */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp size={18} className="text-text-primary" />
                      <span className="text-sm font-medium">Community Consensus</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm mb-4">
                      <span className="flex items-center gap-1.5 text-text-secondary">
                        <Users size={16} /> {complaint.communityVotes} citizens affected
                      </span>
                      <span className="flex items-center gap-1.5 text-text-secondary">
                        <CheckCircle2 size={16} className="text-success" /> {complaint.validatorEndorsements} validators
                      </span>
                    </div>
                  </div>
                  
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="w-full sm:w-auto mt-auto"
                    icon={<TrendingUp size={16} />}
                    loading={isVoting}
                    onClick={handleVote}
                  >
                    I also face this issue
                  </Button>
                </div>

              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function TrackingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-text-muted">Loading...</p></div>}>
      <TrackingContent />
    </Suspense>
  );
}
