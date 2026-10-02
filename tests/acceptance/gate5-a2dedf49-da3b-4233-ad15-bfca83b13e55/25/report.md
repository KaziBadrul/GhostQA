# GhostQA finding evidence

Finding: `3dff95ba-551b-46a7-a7c8-7dca726330f9` — CONFIRMED
Evidence chain: OBSERVED VIOLATION → CONFIRMED → best verified reproducer.
Consistency: true. Artifact: GENERATED / UNVERIFIED.

Predicate: `7a61fa7c-0b33-44f2-b8b0-650a3eaf749b`, version 1, canonical hash `b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e`.
Approval provenance: DEVELOPER; source `a document observed as ARCHIVED must not later be observed as PUBLISHED within the same fresh trial`; eligible as of run acceptance: true.

Original journey length: 3. Best verified journey length: 3.
This is the shortest verified sequence found.
It is locally irreducible under attempted deletion strategy.
Local minimization stop reason: LOCAL MINIMUM.
Truncated: no.

## Expected invariant

When the applicability conditions hold, every approved assertion must be satisfied:

- `{"kind":"json","pointer":"/state","stepId":"later"}` not-equals `{"kind":"literal","value":"PUBLISHED"}`

## Evidence references

- EXPLORATION: evidence `1f990af4-4e94-4d5c-86a3-fa799bf6e12b`, trial `a28c3d60-39d3-41e9-b3c8-471a6bb1b5e5`, baseline `dbc82619-5b9c-4878-a785-9c775eaff457`, verdict VIOLATED.
- REPLAY: evidence `8492e21a-0ca0-4ad9-84dd-dd3329c75739`, trial `411fb869-6939-4dc7-9c42-91f845f6e38f`, baseline `25271730-587f-4cd0-b151-18f255438838`, verdict VIOLATED.

## Minimized reproduction

1. `create` — `POST /api/documents`
2. `archived` — `POST /api/documents/{documentId}/archive`
3. `later` — `POST /api/documents/{documentId}/publish`

## Minimized attempt history

- Remove `create`: rejected; PRODUCER REQUIRED; candidate `b4f079da-287e-4b7e-b513-3fb8e3cc1390`.
- Remove `archived`: rejected; PREDICATE STEP REQUIRED; candidate `88190d9c-66da-4bbe-9d47-059d6733cec3`.
- Remove `later`: rejected; PREDICATE STEP REQUIRED; candidate `d0188ddb-a8d7-4b48-b71c-a8320bb30cca`.

## Setup and verification

Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.
Generation does not establish supervised verification. This manifest has not been verified through the originating run.

## Exact assertions and sanitized evidence

```json
{
  "approval": {
    "asOf": "2026-10-01T22:08:44.782Z",
    "eligible": true,
    "source": "DEVELOPER",
    "sourceRef": "a document observed as ARCHIVED must not later be observed as PUBLISHED within the same fresh trial"
  },
  "bestJourney": {
    "dependencies": [
      {
        "consumer": "archived",
        "producer": "create",
        "variable": "docId"
      },
      {
        "consumer": "later",
        "producer": "create",
        "variable": "docId"
      }
    ],
    "id": "8880cb69-1069-432a-913a-b025bc2f0b1a",
    "predicateRef": {
      "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
      "id": "7a61fa7c-0b33-44f2-b8b0-650a3eaf749b",
      "version": 1
    },
    "rationale": "Validating that an archived document cannot be subsequently published.",
    "steps": [
      {
        "bodyBindings": [],
        "expectedStatuses": [
          201
        ],
        "extracts": [
          {
            "expectedType": "string",
            "name": "docId",
            "sensitive": false,
            "source": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "create"
            }
          }
        ],
        "id": "create",
        "operationId": "POST /api/documents",
        "parameters": []
      },
      {
        "bodyBindings": [],
        "expectedStatuses": [
          200,
          409
        ],
        "extracts": [],
        "id": "archived",
        "operationId": "POST /api/documents/{documentId}/archive",
        "parameters": [
          {
            "location": "path",
            "name": "documentId",
            "value": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "create"
            }
          }
        ]
      },
      {
        "bodyBindings": [],
        "expectedStatuses": [
          200,
          409
        ],
        "extracts": [],
        "id": "later",
        "operationId": "POST /api/documents/{documentId}/publish",
        "parameters": [
          {
            "location": "path",
            "name": "documentId",
            "value": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "create"
            }
          }
        ]
      }
    ],
    "variables": []
  },
  "bestLength": 3,
  "executionProvenance": {
    "acceptedAt": "2026-10-01T22:08:44.782Z",
    "deadlineAt": "2026-10-01T22:18:44.782Z",
    "runId": "fdbb3b49-dd1c-4e97-9533-6b4bed2a3e55",
    "trialIds": [
      "a28c3d60-39d3-41e9-b3c8-471a6bb1b5e5",
      "411fb869-6939-4dc7-9c42-91f845f6e38f"
    ]
  },
  "finding": {
    "classification": "CONFIRMED",
    "consistent": true,
    "id": "3dff95ba-551b-46a7-a7c8-7dca726330f9",
    "initialEvidenceId": "1f990af4-4e94-4d5c-86a3-fa799bf6e12b",
    "minimizationStop": "LOCAL MINIMUM",
    "minimizedJourneyId": "8880cb69-1069-432a-913a-b025bc2f0b1a",
    "originalJourneyId": "8880cb69-1069-432a-913a-b025bc2f0b1a",
    "predicateRef": {
      "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
      "id": "7a61fa7c-0b33-44f2-b8b0-650a3eaf749b",
      "version": 1
    },
    "projectId": "02a99482-ed18-41af-8362-3ec45bb18fd4",
    "replayEvidenceIds": [
      "8492e21a-0ca0-4ad9-84dd-dd3329c75739"
    ],
    "transitions": [
      {
        "evidenceRefs": [
          "1f990af4-4e94-4d5c-86a3-fa799bf6e12b"
        ],
        "next": "OBSERVED VIOLATION",
        "prior": null,
        "reason": "INITIAL PREDICATE VIOLATION"
      },
      {
        "evidenceRefs": [
          "1f990af4-4e94-4d5c-86a3-fa799bf6e12b",
          "8492e21a-0ca0-4ad9-84dd-dd3329c75739"
        ],
        "next": "CONFIRMED",
        "prior": "OBSERVED VIOLATION",
        "reason": "INDEPENDENT FRESH REPLAY VIOLATED"
      }
    ]
  },
  "formatVersion": 1,
  "generationState": "GENERATED",
  "initial": {
    "baseline": {
      "assertionIds": [
        "cb41bcc7-1fe0-4a55-9e12-578f0e8149e0"
      ],
      "checkStepIds": [
        "baseline"
      ],
      "id": "dbc82619-5b9c-4878-a785-9c775eaff457",
      "resetStepIds": [
        "reset"
      ],
      "runId": "fdbb3b49-dd1c-4e97-9533-6b4bed2a3e55",
      "trialId": "a28c3d60-39d3-41e9-b3c8-471a6bb1b5e5",
      "verdict": "SATISFIED"
    },
    "evidence": {
      "baselineEvidenceId": "dbc82619-5b9c-4878-a785-9c775eaff457",
      "id": "1f990af4-4e94-4d5c-86a3-fa799bf6e12b",
      "observationIds": [
        "4ad1ee6b-2350-430f-bb7b-fc6254fa9cd8",
        "7b9a8a29-4b4f-4bf3-9d40-9323405705a4",
        "fcfd0bde-9d42-491b-aaf4-c3e0eaf4ad3b"
      ],
      "outcome": "VIOLATED",
      "phase": "EXPLORATION",
      "predicateRef": {
        "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
        "id": "7a61fa7c-0b33-44f2-b8b0-650a3eaf749b",
        "version": 1
      },
      "runId": "fdbb3b49-dd1c-4e97-9533-6b4bed2a3e55",
      "symbolicOperands": {
        "applicability": [
          {
            "left": {
              "kind": "json",
              "pointer": "/state",
              "stepId": "archived"
            },
            "op": "equals",
            "right": {
              "kind": "literal",
              "value": "ARCHIVED"
            }
          },
          {
            "left": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "archived"
            },
            "op": "equals",
            "right": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "later"
            }
          },
          {
            "left": {
              "kind": "step-index",
              "stepId": "archived"
            },
            "op": "before",
            "right": {
              "kind": "step-index",
              "stepId": "later"
            }
          }
        ],
        "assertions": [
          {
            "left": {
              "kind": "json",
              "pointer": "/state",
              "stepId": "later"
            },
            "op": "not-equals",
            "right": {
              "kind": "literal",
              "value": "PUBLISHED"
            }
          }
        ],
        "executionOrder": [
          {
            "operationId": "POST /api/documents",
            "ordinal": 0,
            "stepId": "create"
          },
          {
            "operationId": "POST /api/documents/{documentId}/archive",
            "ordinal": 1,
            "stepId": "archived"
          },
          {
            "operationId": "POST /api/documents/{documentId}/publish",
            "ordinal": 2,
            "stepId": "later"
          }
        ]
      },
      "trialId": "a28c3d60-39d3-41e9-b3c8-471a6bb1b5e5"
    },
    "observations": [
      {
        "id": "fcfd0bde-9d42-491b-aaf4-c3e0eaf4ad3b",
        "result": {
          "elapsedMs": 1.7854999999981374,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/documents",
            "url": "http://127.0.0.1:53298/api/documents"
          },
          "sanitizedResponse": {
            "body": {
              "id": "8ac04b70-f76f-4962-9a91-f27d1d263bd6",
              "state": "DRAFT"
            },
            "elapsedMs": 1.7854999999981374,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 22:08:48 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 201,
            "text": "{\"id\":\"8ac04b70-f76f-4962-9a91-f27d1d263bd6\",\"state\":\"DRAFT\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T22:08:48.969Z",
          "status": 201,
          "stepId": "create",
          "truncated": false
        },
        "runId": "fdbb3b49-dd1c-4e97-9533-6b4bed2a3e55",
        "stateMappings": [],
        "stepId": "create",
        "trialId": "a28c3d60-39d3-41e9-b3c8-471a6bb1b5e5"
      },
      {
        "id": "7b9a8a29-4b4f-4bf3-9d40-9323405705a4",
        "result": {
          "elapsedMs": 2.6133329999865964,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/documents/{documentId}/archive",
            "url": "http://127.0.0.1:53298/api/documents/8ac04b70-f76f-4962-9a91-f27d1d263bd6/archive"
          },
          "sanitizedResponse": {
            "body": {
              "id": "8ac04b70-f76f-4962-9a91-f27d1d263bd6",
              "state": "ARCHIVED"
            },
            "elapsedMs": 2.6133329999865964,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 22:08:48 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"8ac04b70-f76f-4962-9a91-f27d1d263bd6\",\"state\":\"ARCHIVED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T22:08:48.976Z",
          "status": 200,
          "stepId": "archived",
          "truncated": false
        },
        "runId": "fdbb3b49-dd1c-4e97-9533-6b4bed2a3e55",
        "stateMappings": [],
        "stepId": "archived",
        "trialId": "a28c3d60-39d3-41e9-b3c8-471a6bb1b5e5"
      },
      {
        "id": "4ad1ee6b-2350-430f-bb7b-fc6254fa9cd8",
        "result": {
          "elapsedMs": 2.4344160000036936,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/documents/{documentId}/publish",
            "url": "http://127.0.0.1:53298/api/documents/8ac04b70-f76f-4962-9a91-f27d1d263bd6/publish"
          },
          "sanitizedResponse": {
            "body": {
              "id": "8ac04b70-f76f-4962-9a91-f27d1d263bd6",
              "state": "PUBLISHED"
            },
            "elapsedMs": 2.4344160000036936,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 22:08:48 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"8ac04b70-f76f-4962-9a91-f27d1d263bd6\",\"state\":\"PUBLISHED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T22:08:48.984Z",
          "status": 200,
          "stepId": "later",
          "truncated": false
        },
        "runId": "fdbb3b49-dd1c-4e97-9533-6b4bed2a3e55",
        "stateMappings": [],
        "stepId": "later",
        "trialId": "a28c3d60-39d3-41e9-b3c8-471a6bb1b5e5"
      }
    ]
  },
  "minimization": {
    "attempts": [
      {
        "accepted": false,
        "candidate": {
          "dependencies": [],
          "id": "b4f079da-287e-4b7e-b513-3fb8e3cc1390",
          "predicateRef": {
            "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
            "id": "7a61fa7c-0b33-44f2-b8b0-650a3eaf749b",
            "version": 1
          },
          "rationale": "Validating that an archived document cannot be subsequently published.",
          "steps": [
            {
              "bodyBindings": [],
              "expectedStatuses": [
                200,
                409
              ],
              "extracts": [],
              "id": "archived",
              "operationId": "POST /api/documents/{documentId}/archive",
              "parameters": [
                {
                  "location": "path",
                  "name": "documentId",
                  "value": {
                    "kind": "json",
                    "pointer": "/id",
                    "stepId": "create"
                  }
                }
              ]
            },
            {
              "bodyBindings": [],
              "expectedStatuses": [
                200,
                409
              ],
              "extracts": [],
              "id": "later",
              "operationId": "POST /api/documents/{documentId}/publish",
              "parameters": [
                {
                  "location": "path",
                  "name": "documentId",
                  "value": {
                    "kind": "json",
                    "pointer": "/id",
                    "stepId": "create"
                  }
                }
              ]
            }
          ],
          "variables": []
        },
        "observations": [],
        "reason": "PRODUCER REQUIRED",
        "removedStepId": "create"
      },
      {
        "accepted": false,
        "candidate": {
          "dependencies": [
            {
              "consumer": "later",
              "producer": "create",
              "variable": "docId"
            }
          ],
          "id": "88190d9c-66da-4bbe-9d47-059d6733cec3",
          "predicateRef": {
            "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
            "id": "7a61fa7c-0b33-44f2-b8b0-650a3eaf749b",
            "version": 1
          },
          "rationale": "Validating that an archived document cannot be subsequently published.",
          "steps": [
            {
              "bodyBindings": [],
              "expectedStatuses": [
                201
              ],
              "extracts": [
                {
                  "expectedType": "string",
                  "name": "docId",
                  "sensitive": false,
                  "source": {
                    "kind": "json",
                    "pointer": "/id",
                    "stepId": "create"
                  }
                }
              ],
              "id": "create",
              "operationId": "POST /api/documents",
              "parameters": []
            },
            {
              "bodyBindings": [],
              "expectedStatuses": [
                200,
                409
              ],
              "extracts": [],
              "id": "later",
              "operationId": "POST /api/documents/{documentId}/publish",
              "parameters": [
                {
                  "location": "path",
                  "name": "documentId",
                  "value": {
                    "kind": "json",
                    "pointer": "/id",
                    "stepId": "create"
                  }
                }
              ]
            }
          ],
          "variables": []
        },
        "observations": [],
        "reason": "PREDICATE STEP REQUIRED",
        "removedStepId": "archived"
      },
      {
        "accepted": false,
        "candidate": {
          "dependencies": [
            {
              "consumer": "archived",
              "producer": "create",
              "variable": "docId"
            }
          ],
          "id": "d0188ddb-a8d7-4b48-b71c-a8320bb30cca",
          "predicateRef": {
            "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
            "id": "7a61fa7c-0b33-44f2-b8b0-650a3eaf749b",
            "version": 1
          },
          "rationale": "Validating that an archived document cannot be subsequently published.",
          "steps": [
            {
              "bodyBindings": [],
              "expectedStatuses": [
                201
              ],
              "extracts": [
                {
                  "expectedType": "string",
                  "name": "docId",
                  "sensitive": false,
                  "source": {
                    "kind": "json",
                    "pointer": "/id",
                    "stepId": "create"
                  }
                }
              ],
              "id": "create",
              "operationId": "POST /api/documents",
              "parameters": []
            },
            {
              "bodyBindings": [],
              "expectedStatuses": [
                200,
                409
              ],
              "extracts": [],
              "id": "archived",
              "operationId": "POST /api/documents/{documentId}/archive",
              "parameters": [
                {
                  "location": "path",
                  "name": "documentId",
                  "value": {
                    "kind": "json",
                    "pointer": "/id",
                    "stepId": "create"
                  }
                }
              ]
            }
          ],
          "variables": []
        },
        "observations": [],
        "reason": "PREDICATE STEP REQUIRED",
        "removedStepId": "later"
      }
    ],
    "best": {
      "dependencies": [
        {
          "consumer": "archived",
          "producer": "create",
          "variable": "docId"
        },
        {
          "consumer": "later",
          "producer": "create",
          "variable": "docId"
        }
      ],
      "id": "8880cb69-1069-432a-913a-b025bc2f0b1a",
      "predicateRef": {
        "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
        "id": "7a61fa7c-0b33-44f2-b8b0-650a3eaf749b",
        "version": 1
      },
      "rationale": "Validating that an archived document cannot be subsequently published.",
      "steps": [
        {
          "bodyBindings": [],
          "expectedStatuses": [
            201
          ],
          "extracts": [
            {
              "expectedType": "string",
              "name": "docId",
              "sensitive": false,
              "source": {
                "kind": "json",
                "pointer": "/id",
                "stepId": "create"
              }
            }
          ],
          "id": "create",
          "operationId": "POST /api/documents",
          "parameters": []
        },
        {
          "bodyBindings": [],
          "expectedStatuses": [
            200,
            409
          ],
          "extracts": [],
          "id": "archived",
          "operationId": "POST /api/documents/{documentId}/archive",
          "parameters": [
            {
              "location": "path",
              "name": "documentId",
              "value": {
                "kind": "json",
                "pointer": "/id",
                "stepId": "create"
              }
            }
          ]
        },
        {
          "bodyBindings": [],
          "expectedStatuses": [
            200,
            409
          ],
          "extracts": [],
          "id": "later",
          "operationId": "POST /api/documents/{documentId}/publish",
          "parameters": [
            {
              "location": "path",
              "name": "documentId",
              "value": {
                "kind": "json",
                "pointer": "/id",
                "stepId": "create"
              }
            }
          ]
        }
      ],
      "variables": []
    },
    "bestLength": 3,
    "finding": {
      "classification": "CONFIRMED",
      "consistent": true,
      "id": "3dff95ba-551b-46a7-a7c8-7dca726330f9",
      "initialEvidenceId": "1f990af4-4e94-4d5c-86a3-fa799bf6e12b",
      "minimizationStop": "LOCAL MINIMUM",
      "minimizedJourneyId": "8880cb69-1069-432a-913a-b025bc2f0b1a",
      "originalJourneyId": "8880cb69-1069-432a-913a-b025bc2f0b1a",
      "predicateRef": {
        "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
        "id": "7a61fa7c-0b33-44f2-b8b0-650a3eaf749b",
        "version": 1
      },
      "projectId": "02a99482-ed18-41af-8362-3ec45bb18fd4",
      "replayEvidenceIds": [
        "8492e21a-0ca0-4ad9-84dd-dd3329c75739"
      ],
      "transitions": [
        {
          "evidenceRefs": [
            "1f990af4-4e94-4d5c-86a3-fa799bf6e12b"
          ],
          "next": "OBSERVED VIOLATION",
          "prior": null,
          "reason": "INITIAL PREDICATE VIOLATION"
        },
        {
          "evidenceRefs": [
            "1f990af4-4e94-4d5c-86a3-fa799bf6e12b",
            "8492e21a-0ca0-4ad9-84dd-dd3329c75739"
          ],
          "next": "CONFIRMED",
          "prior": "OBSERVED VIOLATION",
          "reason": "INDEPENDENT FRESH REPLAY VIOLATED"
        }
      ]
    },
    "locallyIrreducible": true,
    "originalLength": 3,
    "stopReason": "LOCAL MINIMUM"
  },
  "originalJourney": {
    "dependencies": [
      {
        "consumer": "archived",
        "producer": "create",
        "variable": "docId"
      },
      {
        "consumer": "later",
        "producer": "create",
        "variable": "docId"
      }
    ],
    "id": "8880cb69-1069-432a-913a-b025bc2f0b1a",
    "predicateRef": {
      "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
      "id": "7a61fa7c-0b33-44f2-b8b0-650a3eaf749b",
      "version": 1
    },
    "rationale": "Validating that an archived document cannot be subsequently published.",
    "steps": [
      {
        "bodyBindings": [],
        "expectedStatuses": [
          201
        ],
        "extracts": [
          {
            "expectedType": "string",
            "name": "docId",
            "sensitive": false,
            "source": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "create"
            }
          }
        ],
        "id": "create",
        "operationId": "POST /api/documents",
        "parameters": []
      },
      {
        "bodyBindings": [],
        "expectedStatuses": [
          200,
          409
        ],
        "extracts": [],
        "id": "archived",
        "operationId": "POST /api/documents/{documentId}/archive",
        "parameters": [
          {
            "location": "path",
            "name": "documentId",
            "value": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "create"
            }
          }
        ]
      },
      {
        "bodyBindings": [],
        "expectedStatuses": [
          200,
          409
        ],
        "extracts": [],
        "id": "later",
        "operationId": "POST /api/documents/{documentId}/publish",
        "parameters": [
          {
            "location": "path",
            "name": "documentId",
            "value": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "create"
            }
          }
        ]
      }
    ],
    "variables": []
  },
  "originalLength": 3,
  "predicate": {
    "applicability": [
      {
        "left": {
          "kind": "json",
          "pointer": "/state",
          "stepId": "archived"
        },
        "op": "equals",
        "right": {
          "kind": "literal",
          "value": "ARCHIVED"
        }
      },
      {
        "left": {
          "kind": "json",
          "pointer": "/id",
          "stepId": "archived"
        },
        "op": "equals",
        "right": {
          "kind": "json",
          "pointer": "/id",
          "stepId": "later"
        }
      },
      {
        "left": {
          "kind": "step-index",
          "stepId": "archived"
        },
        "op": "before",
        "right": {
          "kind": "step-index",
          "stepId": "later"
        }
      }
    ],
    "assertions": [
      {
        "left": {
          "kind": "json",
          "pointer": "/state",
          "stepId": "later"
        },
        "op": "not-equals",
        "right": {
          "kind": "literal",
          "value": "PUBLISHED"
        }
      }
    ],
    "canonicalHash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
    "id": "7a61fa7c-0b33-44f2-b8b0-650a3eaf749b",
    "source": "DEVELOPER",
    "sourceRef": "a document observed as ARCHIVED must not later be observed as PUBLISHED within the same fresh trial",
    "version": 1
  },
  "predicateRef": {
    "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
    "id": "7a61fa7c-0b33-44f2-b8b0-650a3eaf749b",
    "version": 1
  },
  "replays": [
    {
      "baseline": {
        "assertionIds": [
          "cb41bcc7-1fe0-4a55-9e12-578f0e8149e0"
        ],
        "checkStepIds": [
          "baseline"
        ],
        "id": "25271730-587f-4cd0-b151-18f255438838",
        "resetStepIds": [
          "reset"
        ],
        "runId": "fdbb3b49-dd1c-4e97-9533-6b4bed2a3e55",
        "trialId": "411fb869-6939-4dc7-9c42-91f845f6e38f",
        "verdict": "SATISFIED"
      },
      "evidence": {
        "baselineEvidenceId": "25271730-587f-4cd0-b151-18f255438838",
        "id": "8492e21a-0ca0-4ad9-84dd-dd3329c75739",
        "observationIds": [
          "c999e58a-8926-4c9e-916c-6cfe0a227221",
          "bde5317e-de7c-4dbe-a91c-c9cccda47f26",
          "d65d6b05-0f32-4123-adcb-b8f3f16fd38f"
        ],
        "outcome": "VIOLATED",
        "phase": "REPLAY",
        "predicateRef": {
          "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
          "id": "7a61fa7c-0b33-44f2-b8b0-650a3eaf749b",
          "version": 1
        },
        "runId": "fdbb3b49-dd1c-4e97-9533-6b4bed2a3e55",
        "symbolicOperands": {
          "applicability": [
            {
              "left": {
                "kind": "json",
                "pointer": "/state",
                "stepId": "archived"
              },
              "op": "equals",
              "right": {
                "kind": "literal",
                "value": "ARCHIVED"
              }
            },
            {
              "left": {
                "kind": "json",
                "pointer": "/id",
                "stepId": "archived"
              },
              "op": "equals",
              "right": {
                "kind": "json",
                "pointer": "/id",
                "stepId": "later"
              }
            },
            {
              "left": {
                "kind": "step-index",
                "stepId": "archived"
              },
              "op": "before",
              "right": {
                "kind": "step-index",
                "stepId": "later"
              }
            }
          ],
          "assertions": [
            {
              "left": {
                "kind": "json",
                "pointer": "/state",
                "stepId": "later"
              },
              "op": "not-equals",
              "right": {
                "kind": "literal",
                "value": "PUBLISHED"
              }
            }
          ],
          "executionOrder": [
            {
              "operationId": "POST /api/documents",
              "ordinal": 0,
              "stepId": "create"
            },
            {
              "operationId": "POST /api/documents/{documentId}/archive",
              "ordinal": 1,
              "stepId": "archived"
            },
            {
              "operationId": "POST /api/documents/{documentId}/publish",
              "ordinal": 2,
              "stepId": "later"
            }
          ]
        },
        "trialId": "411fb869-6939-4dc7-9c42-91f845f6e38f"
      },
      "observations": [
        {
          "id": "c999e58a-8926-4c9e-916c-6cfe0a227221",
          "result": {
            "elapsedMs": 2.2165420000092126,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/documents",
              "url": "http://127.0.0.1:53298/api/documents"
            },
            "sanitizedResponse": {
              "body": {
                "id": "386ec1f3-81b7-4562-bb38-880042772c44",
                "state": "DRAFT"
              },
              "elapsedMs": 2.2165420000092126,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 22:08:49 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 201,
              "text": "{\"id\":\"386ec1f3-81b7-4562-bb38-880042772c44\",\"state\":\"DRAFT\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T22:08:49.026Z",
            "status": 201,
            "stepId": "create",
            "truncated": false
          },
          "runId": "fdbb3b49-dd1c-4e97-9533-6b4bed2a3e55",
          "stateMappings": [],
          "stepId": "create",
          "trialId": "411fb869-6939-4dc7-9c42-91f845f6e38f"
        },
        {
          "id": "bde5317e-de7c-4dbe-a91c-c9cccda47f26",
          "result": {
            "elapsedMs": 1.4510830000217538,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/documents/{documentId}/archive",
              "url": "http://127.0.0.1:53298/api/documents/386ec1f3-81b7-4562-bb38-880042772c44/archive"
            },
            "sanitizedResponse": {
              "body": {
                "id": "386ec1f3-81b7-4562-bb38-880042772c44",
                "state": "ARCHIVED"
              },
              "elapsedMs": 1.4510830000217538,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 22:08:49 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"386ec1f3-81b7-4562-bb38-880042772c44\",\"state\":\"ARCHIVED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T22:08:49.032Z",
            "status": 200,
            "stepId": "archived",
            "truncated": false
          },
          "runId": "fdbb3b49-dd1c-4e97-9533-6b4bed2a3e55",
          "stateMappings": [],
          "stepId": "archived",
          "trialId": "411fb869-6939-4dc7-9c42-91f845f6e38f"
        },
        {
          "id": "d65d6b05-0f32-4123-adcb-b8f3f16fd38f",
          "result": {
            "elapsedMs": 1.3485419999924488,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/documents/{documentId}/publish",
              "url": "http://127.0.0.1:53298/api/documents/386ec1f3-81b7-4562-bb38-880042772c44/publish"
            },
            "sanitizedResponse": {
              "body": {
                "id": "386ec1f3-81b7-4562-bb38-880042772c44",
                "state": "PUBLISHED"
              },
              "elapsedMs": 1.3485419999924488,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 22:08:49 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"386ec1f3-81b7-4562-bb38-880042772c44\",\"state\":\"PUBLISHED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T22:08:49.036Z",
            "status": 200,
            "stepId": "later",
            "truncated": false
          },
          "runId": "fdbb3b49-dd1c-4e97-9533-6b4bed2a3e55",
          "stateMappings": [],
          "stepId": "later",
          "trialId": "411fb869-6939-4dc7-9c42-91f845f6e38f"
        }
      ]
    }
  ],
  "reproductionClaim": "shortest verified sequence found",
  "runId": "fdbb3b49-dd1c-4e97-9533-6b4bed2a3e55",
  "setup": "Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.",
  "stopReason": "LOCAL MINIMUM",
  "truncated": false,
  "verification": "UNVERIFIED"
}
```
