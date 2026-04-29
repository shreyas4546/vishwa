"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Users, TrendingUp, AlertTriangle, RefreshCw } from "lucide-react";
import type { Complaint } from "@/lib/types";
import { complaintService, type ApiComplaint } from "@/services/complaintService";
import { communityService } from "@/services/communityService";
import { mapApiComplaintToFrontend } from "@/lib/apiTransformers";
import { ComplaintPost } from "@/components/ui/ComplaintPost";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useI18n } from "@/lib/i18n/I18nContext";

export default function CommunityFeedPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<"all" | "escalated" | "needs_funding">("all");
  const { t } = useI18n();

  const loadComplaints = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      // Use public feed endpoint (no auth required)
      const { default: api } = await import("@/services/api");
      const res = await api.get("/complaints/feed?page=1&limit=50") as unknown as { data: ApiComplaint[]; success: boolean };
      const data = res?.data || [];
      if (Array.isArray(data)) {
        // Load local donations
        const localDonationsStr = typeof window !== 'undefined' ? localStorage.getItem('vishwas_donations') : null;
        const localDonations = localDonationsStr ? JSON.parse(localDonationsStr) : {};

        const mapped = data
          .map((c: ApiComplaint) => {
            const complaint = mapApiComplaintToFrontend(c);
            complaint.approved = true;
            // Inject local donation amount if exists
            if (localDonations[complaint.id]) {
              complaint.amountRaised = localDonations[complaint.id];
            }
            return complaint;
          })
          // Safety filter: exclude rejected, but allow pending_review since if they are in the feed, an admin has manually verified them
          .filter(c => c.aiDecision !== 'rejected');
        setComplaints(mapped);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load community feed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  const handleVote = async (id: string) => {
    // Find the complaint by display id and get API id
    const complaint = complaints.find(c => c.id === id);
    if (!complaint?._apiId) return;

    try {
      const result = await communityService.vote(complaint._apiId);
      setComplaints(prev => prev.map(c => {
        if (c.id === id) {
          return {
            ...c,
            communityVotes: c.communityVotes + 1,
            genuinenessScore: result?.genuineness_score ?? c.genuinenessScore,
          };
        }
        return c;
      }));
    } catch {
      alert("You may have already voted on this complaint.");
    }
  };

  const handleDonate = (id: string, amount: number) => {
    setComplaints(prev => prev.map(c => {
      if (c.id === id) {
        const newAmount = (c.amountRaised || 0) + amount;
        // Persist to local storage
        if (typeof window !== 'undefined') {
          const localDonationsStr = localStorage.getItem('vishwas_donations');
          const localDonations = localDonationsStr ? JSON.parse(localDonationsStr) : {};
          localDonations[id] = newAmount;
          localStorage.setItem('vishwas_donations', JSON.stringify(localDonations));
        }
        return { ...c, amountRaised: newAmount };
      }
      return c;
    }));
  };

  const filteredComplaints = complaints.filter(c => {
    if (filter === "escalated") return c.escalationLevel > 0 || c.communityVotes >= 50 || c.status === 'action_taken' || c.status === 'resolved' || c.priority === 'critical';
    if (filter === "needs_funding") return c.targetAmount && c.targetAmount > 0 && (c.amountRaised || 0) < c.targetAmount;
    return true;
  }).sort((a, b) => b.communityVotes - a.communityVotes);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-text-muted">Loading community feed...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card variant="outline" padding="lg" className="max-w-md w-full text-center border-danger/30">
          <AlertTriangle size={40} className="text-danger mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Feed Error</h2>
          <p className="text-sm text-text-secondary mb-6">{loadError}</p>
          <Button onClick={loadComplaints} icon={<RefreshCw size={16} />}>Retry</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-surface pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Sidebar - Filters & Stats */}
        <div className="hidden lg:block lg:col-span-3 space-y-6">
          <div className="bg-white rounded-2xl border border-border p-6 shadow-sm sticky top-24">
            <h3 className="font-display font-bold text-lg mb-4 text-text-primary">{t("comm.title")}</h3>
            <p className="text-sm text-text-secondary mb-6 leading-relaxed">
              {t("comm.subtitle")}
            </p>
            
            <div className="space-y-2 flex flex-col">
              <Button 
                variant={filter === "all" ? "primary" : "outline"} 
                className="justify-start border-transparent"
                onClick={() => setFilter("all")}
              >
                <TrendingUp size={18} className="mr-3" />
                {t("comm.tab.trending")}
              </Button>
              <Button 
                variant={filter === "escalated" ? "primary" : "outline"} 
                className="justify-start border-transparent"
                onClick={() => setFilter("escalated")}
              >
                <AlertTriangle size={18} className="mr-3" />
                {t("comm.tab.escalated")}
              </Button>
              <Button 
                variant={filter === "needs_funding" ? "primary" : "outline"} 
                className="justify-start border-transparent text-[#8b5a2b]"
                onClick={() => setFilter("needs_funding")}
              >
                <Users size={18} className="mr-3" />
                {t("comm.tab.funding") || "Needs Funding"}
              </Button>
            </div>
          </div>
        </div>

        {/* Center - Main Feed */}
        <div className="lg:col-span-6">
          {/* Mobile Filter Tabs */}
          <div className="lg:hidden flex gap-2 overflow-x-auto pb-4 mb-2 hide-scrollbar">
            <Badge 
              variant={filter === "all" ? "accent" : "outline"} 
              className="cursor-pointer whitespace-nowrap px-4 py-2"
              onClick={() => setFilter("all")}
            >
              {t("comm.tab.trending")}
            </Badge>
            <Badge 
              variant={filter === "escalated" ? "accent" : "outline"} 
              className="cursor-pointer whitespace-nowrap px-4 py-2"
              onClick={() => setFilter("escalated")}
            >
              {t("comm.tab.escalated")}
            </Badge>
            <Badge 
              variant={filter === "needs_funding" ? "warning" : "outline"} 
              className="cursor-pointer whitespace-nowrap px-4 py-2 text-[#8b5a2b]"
              onClick={() => setFilter("needs_funding")}
            >
              {t("comm.tab.funding") || "Needs Funding"}
            </Badge>
          </div>

          <div className="space-y-6">
            {filteredComplaints.length === 0 ? (
              <div className="bg-white rounded-2xl border border-border p-12 text-center shadow-sm">
                <Users size={48} className="mx-auto text-text-muted mb-4" />
                <h3 className="text-xl font-bold text-text-primary mb-2">{t("comm.empty.title") || "No complaints found"}</h3>
                <p className="text-text-secondary">{t("comm.empty.desc") || "Be the first to raise an issue for your community."}</p>
              </div>
            ) : (
              filteredComplaints.map((complaint) => (
                <ComplaintPost 
                  key={complaint.id} 
                  complaint={complaint} 
                  onVote={handleVote}
                  onDonate={handleDonate}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Sidebar - Trending Domains */}
        <div className="hidden lg:block lg:col-span-3 space-y-6">
          <div className="bg-white rounded-2xl border border-border p-6 shadow-sm sticky top-24">
            <h3 className="font-display font-bold text-lg mb-4 text-text-primary">{t("comm.top")}</h3>
            <div className="space-y-4">
              {complaints.slice(0, 3).map((c, i) => (
                <div key={c.id} className={`flex items-start justify-between ${i < 2 ? "pb-3 border-b border-border" : ""}`}>
                  <div>
                    <p className="text-sm font-semibold text-text-primary truncate max-w-[160px]">
                      {c.summary || c.rawText.slice(0, 40)}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {c.location || c.category} • {c.communityVotes} Votes
                    </p>
                  </div>
                  <Badge 
                    variant={c.priority === "critical" ? "danger" : c.priority === "high" ? "warning" : "default"} 
                    size="sm"
                  >
                    {c.priority === "critical" ? "Critical" : c.priority === "high" ? "High" : "Normal"}
                  </Badge>
                </div>
              ))}
              {complaints.length === 0 && (
                <p className="text-sm text-text-muted">No trending issues yet</p>
              )}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
