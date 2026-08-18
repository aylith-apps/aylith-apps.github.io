---
name: Videx
tagline: Turn any video library into a domain-tailored knowledge base
description: >-
  Videx indexes YouTube channels and their full transcripts, then adapts its search, summaries and
  topic discovery to the domain you pick — AI engineering, data science, system design, security,
  creative tech, or anything at all.
category: developer-tools
status: beta
features:
  - Pick a knowledge domain and the whole app retunes to it
  - Channel and video transcript ingestion with chapter and metadata extraction
  - Full-text plus pgvector semantic search across every transcript
  - AI summaries, topics and extraction over a pluggable provider chain
  - Chat grounded in a video's transcript, answers cited back to timestamps
  - YouTube OAuth sync for personal playlists and video groups
targetUser: >-
  Developers and researchers who learn from video and need it searchable, quotable and organised
  around the field they actually work in.
featured: true
order: 20
icon: M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z
gradientFrom: '#8b5cf6'
gradientTo: '#ec4899'
repoUrl: https://github.com/aylith-labs/videx
---

## Vision

The best technical talks, deep dives and frontier lectures are on YouTube, and video is the worst
medium there is for finding a specific idea again. Videx turns a library of channels into an index
you can search, quote and interrogate — and it shapes itself around the field you are studying
rather than assuming everyone is here for the same thing.

## The problem

Video knowledge sits in unsearchable timelines, spread across creators who never agreed on
vocabulary. A single generic search box treats a shader tutorial and a distributed-consensus talk
the same way, so the queries that would surface the right moment never get suggested and the
summaries never use the right words.

## How it works

- **Domain personalization** — choose AI Engineering, Data Science, System Design, Cybersecurity,
  Creative Tech, or the universal profile. Suggested queries, focus topics, channel discovery and
  AI prompts all retune, and switching is instant.
- **Transcript-first ingestion** — channel listings via InnerTube, captions, chapters and engagement
  metadata, stored as timestamped segments rather than one flat blob.
- **Hybrid search** — PostgreSQL full-text for the exact phrase, pgvector embeddings for the idea
  you can only describe.
- **Grounded chat** — ask a question against one video and every claim links back to the second it
  came from.
- **Provider-agnostic AI** — a fallback chain across providers, so a rate limit degrades the answer
  rather than the app.
