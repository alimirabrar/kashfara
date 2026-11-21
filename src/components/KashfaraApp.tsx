"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { parseApiResponse } from "@/lib/api-response";
import { AppShell, type NavSection } from "./AppShell";
import { OverviewView } from "./OverviewView";
import { DocumentWorkspaceView } from "./DocumentWorkspaceView";
import { ExtractionHistoryView } from "./ExtractionHistoryView";
import { DocumentQAView } from "./DocumentQAView";
import { DigitalFormsView } from "./DigitalFormsView";
import { SettingsView } from "./SettingsView";
import type {
  CapacityEstimate,
  DailyUsageLedgerState,
  DocumentRecord,
  ProviderEligibility,
} from "@/types/kashfara";

export function KashfaraApp() {
  const [activeNav, setActiveNav] = useState<NavSection>("overview");
  const [providers, setProviders] = useState<ProviderEligibility[]>([]);
  const [ledger, setLedger] = useState<DailyUsageLedgerState | null>(null);
  const [capacity, setCapacity] = useState<CapacityEstimate | null>(null);
  const [sessionDocs, setSessionDocs] = useState<DocumentRecord[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);

  const activeDoc = useMemo(
    () => sessionDocs.find((d) => d.id === activeDocId) || null,
    [sessionDocs, activeDocId]
  );

  const docSummaries = useMemo(
    () =>
      sessionDocs.map((d) => ({
        id: d.id,
        filename: d.filename,
        format: d.format,
        size_bytes: d.size_bytes,
        page_count: d.page_count,
        status: d.status,
        classification: d.classification,
        fields_count: d.fields.length,
        tables_count: d.tables.length,
        created_at: d.created_at,
        updated_at: d.updated_at,
        total_processing_ms: d.total_processing_ms,
      })),
    [sessionDocs]
  );

  const loadDashboardData = useCallback(async (refreshProviders = false) => {
    try {
      const [provRes, usageRes] = await Promise.all([
        fetch(`/api/providers${refreshProviders ? "?refresh=true" : ""}`),
        fetch("/api/usage/daily"),
      ]);

      if (provRes.ok) {
        const pJson = await parseApiResponse(provRes);
        setProviders(pJson.providers || []);
      }

      if (usageRes.ok) {
        const uJson = await parseApiResponse(usageRes);
        setLedger(uJson.ledger || null);
        setCapacity(uJson.capacity || null);
      }
    } catch {
      // Keep UI resilient
    }
  }, []);

  useEffect(() => {
    let active = true;
    const init = async () => {
      if (active) {
        await loadDashboardData(false);
      }
    };
    void init();
    return () => {
      active = false;
    };
  }, [loadDashboardData]);

  function openDocument(docId: string, targetNav: NavSection = "workspace") {
    setActiveDocId(docId);
    setActiveNav(targetNav);
  }

  async function deleteDocument(docId: string) {
    setSessionDocs((prev) => prev.filter((d) => d.id !== docId));
    if (activeDocId === docId) setActiveDocId(null);
  }

  function upsertSessionDoc(doc: DocumentRecord) {
    setSessionDocs((prev) => {
      const exists = prev.some((d) => d.id === doc.id);
      if (exists) {
        return prev.map((d) => (d.id === doc.id ? doc : d));
      }
      return [doc, ...prev];
    });
  }

  function handleUploadedAndProcessed(doc: DocumentRecord) {
    upsertSessionDoc(doc);
    setActiveDocId(doc.id);
    setActiveNav("workspace");
    void loadDashboardData(false);
  }

  function handleDocumentUpdated(doc: DocumentRecord) {
    upsertSessionDoc(doc);
    setActiveDocId(doc.id);
    void loadDashboardData(false);
  }

  const eligibleVisionCount = providers.filter(
    (p) => p.eligible_for_routing && p.supports_vision && p.supports_document_images
  ).length;

  return (
    <AppShell
      activeNav={activeNav}
      onSelectNav={setActiveNav}
      eligibleVisionCount={eligibleVisionCount}
      dailyDocsProcessed={ledger?.documents_processed_today ?? 0}
      dailyTarget={capacity?.daily_document_target ?? 30}
    >
      {activeNav === "overview" && (
        <OverviewView
          ledger={ledger}
          capacity={capacity}
          providers={providers}
          documents={docSummaries}
          onRefresh={() => void loadDashboardData(true)}
          onUploadedAndProcessed={handleUploadedAndProcessed}
          onOpenDocument={(id) => openDocument(id, "workspace")}
        />
      )}

      {activeNav === "workspace" && (
        <DocumentWorkspaceView
          doc={activeDoc}
          onDocumentUpdated={handleDocumentUpdated}
          onOpenDigitalForms={() => setActiveNav("forms")}
          maxPages={capacity?.max_document_pages ?? 10}
        />
      )}

      {activeNav === "history" && (
        <ExtractionHistoryView
          documents={docSummaries}
          onOpenDocument={(id) => openDocument(id, "workspace")}
          onDeleteDocument={deleteDocument}
        />
      )}

      {activeNav === "qa" && (
        <DocumentQAView
          documents={docSummaries}
          activeDoc={activeDoc}
          onSelectDocument={(id) => openDocument(id, "qa")}
          onDocumentUpdated={handleDocumentUpdated}
        />
      )}

      {activeNav === "forms" && (
        <DigitalFormsView
          key={activeDoc?.id || "none"}
          activeDoc={activeDoc}
          onDocumentUpdated={handleDocumentUpdated}
        />
      )}

      {activeNav === "settings" && (
        <SettingsView
          providers={providers}
          onRefreshProviders={() => void loadDashboardData(true)}
        />
      )}
    </AppShell>
  );
}
