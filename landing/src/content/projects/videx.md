---
name: Videx
tagline: YouTube-first AI coding knowledge base
description: >-
  A knowledge base that indexes AI coding tool channels, videos, and full transcripts
  with full-text and pgvector semantic search, AI summaries, and transcript-grounded chat.
category: developer-tools
status: beta
features:
  - YouTube channel and video transcript scraping
  - Full-text and pgvector semantic search across all transcripts
  - Multi-provider AI summaries, topics, and extraction (GPT-5.6 Luna)
  - Interactive chat grounded in video transcripts with citations
  - YouTube OAuth account sync and personal playlists
targetUser: >-
  Developers and teams tracking the fast-moving AI coding ecosystem through video tutorials, demos, and deep dives
featured: true
order: 20
icon: M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z
gradientFrom: '#8b5cf6'
gradientTo: '#ec4899'
repoUrl: https://github.com/aylith-labs/videx
---

## Vision

The best technical tutorials and frontier workflow walkthroughs for modern AI developer tools live on YouTube, but video is inherently difficult to search, reference, and quote. Videx turns hours of video content into an indexed, searchable, and interactive knowledge base.

## The Problem

Video transcripts are buried behind timelines and lack structural context. Finding an exact CLI trick, prompt pattern, or architecture tip across dozens of creator channels requires manually scrubbing through hours of footage.

## Key Differentiators

- **Transcript-First Indexing**: Deep extraction of YouTube captions, chapters, and metadata.
- **Hybrid Semantic Search**: Combines BM25 full-text filtering with pgvector embeddings for conceptual search.
- **Grounded Video Chat**: Ask questions directly against a video's transcript with timestamped citations.
- **Multi-Provider Fallback**: AI enrichment powered by GPT-5.6 Luna with automatic fallback chains across providers.
