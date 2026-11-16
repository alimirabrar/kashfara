"use client";

import React, { useCallback, useEffect, useState } from "react";
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

interface DocSummary {
  id: string;
  filename: string;
  format: string;
  size_bytes: number;
  page_count: number;
  status: string;
  classification?: { document_type: string; language: string; is_form?: boolean };
  fields_count: number;
  tables_count: number;
  created_at: string;
  updated_at: string;
  total_processing_ms?: number;
}

export function KashfaraApp() {
  const [activeNav, setActiveNav] = useState<NavSection>("overview");
  const [providers, setProviders] = useState<ProviderEligibility[]>([]);
  const [ledger, setLedger] = useState<DailyUsageLedgerState | null>(null);
  const [capacity, setCapacity] = useState<CapacityEstimate | null>(null);
  const [documents, setDocuments] = useState<DocSummary[]>([]);
  const [activeDoc, setActiveDoc] = useState<DocumentRecord | null>(null);

  const loadDashboardData = useCallback(async (refreshProviders = false) => {
    try {
      const [provRes, usageRes, docsRes] = await Promise.all([
        fetch(`/api/providers${refreshProviders ? "?refresh=true" : ""}`),
        fetch("/api/usage/daily"),
        fetch("/api/documents"),
      ]);

      if (provRes.ok) {
        const pJson = await provRes.json();
        setProviders(pJson.providers || []);
      }

      if (usageRes.ok) {
        const uJson = await usageRes.json();
        setLedger(uJson.ledger || null);
        setCapacity(uJson.capacity || null);
      }

      if (docsRes.ok) {
        const dJson = await docsRes.json();
        setDocuments(dJson.documents || []);
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

  async function openDocument(docId: string, targetNav: NavSection = "workspace") {
    const res = await fetch(`/api/documents/${docId}`);
    if (res.ok) {
      const json = await res.json();
      setActiveDoc(json.document);
      setActiveNav(targetNav);
    }
  }

  async function deleteDocument(docId: string) {
    const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
    if (res.ok) {
      if (activeDoc?.id === docId) setActiveDoc(null);
      await loadDashboardData(false);
    }
  }

  function handleUploadedAndProcessed(doc: DocumentRecord) {
    setActiveDoc(doc);
    setActiveNav("workspace");
    void loadDashboardData(false);
  }

  function handleDocumentUpdated(doc: DocumentRecord) {
    setActiveDoc(doc);
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
          documents={documents}
          onRefresh={() => void loadDashboardData(true)}
          onUploadedAndProcessed={handleUploadedAndProcessed}
          onOpenDocument={(id) => void openDocument(id, "workspace")}
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
          documents={documents}
          onOpenDocument={(id) => void openDocument(id, "workspace")}
          onDeleteDocument={deleteDocument}
        />
      )}

      {activeNav === "qa" && (
        <DocumentQAView
          documents={documents}
          activeDoc={activeDoc}
          onSelectDocument={(id) => void openDocument(id, "qa")}
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
