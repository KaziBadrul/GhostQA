# GhostQA finding evidence

Finding: `674a2692-e342-4a29-ac8a-919e870db6b2` — CONFIRMED
Evidence chain: OBSERVED VIOLATION → CONFIRMED → best verified reproducer.
Consistency: true. Artifact: GENERATED / UNVERIFIED.

Predicate: `ca808641-16b4-43e1-8a6c-04c5e04cb777`, version 1, canonical hash `b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e`.
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

- EXPLORATION: evidence `dc615084-c643-4fed-8705-61c1e1ea6d3f`, trial `58475fe2-8954-4833-9e95-1e4f728924d4`, baseline `760dfbb2-ad5f-434d-951a-b686d50abbbd`, verdict VIOLATED.
- REPLAY: evidence `f10877be-1055-47ad-8d64-943ec81d04f1`, trial `100a0737-8df7-4d55-a5e1-b1b81c3dfe76`, baseline `8a815d1b-e3f3-4284-aa10-4d6f4033e839`, verdict VIOLATED.

## Minimized reproduction

1. `step-create` — `POST /api/documents`
2. `archived` — `POST /api/documents/{documentId}/archive`
3. `later` — `POST /api/documents/{documentId}/publish`

## Minimized attempt history

- Remove `step-create`: rejected; PRODUCER REQUIRED; candidate `cb559b5b-809d-442d-bed8-1f57d44e692c`.
- Remove `archived`: rejected; PREDICATE STEP REQUIRED; candidate `334f14e8-3d5c-44d4-9b69-a16e66836ce7`.
- Remove `later`: rejected; PREDICATE STEP REQUIRED; candidate `e091d257-65fa-4356-8132-13a9e3497341`.

## Setup and verification

Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.
Generation does not establish supervised verification. This manifest has not been verified through the originating run.

## Exact assertions and sanitized evidence

```json
{
  "approval": {
    "asOf": "2026-10-01T22:22:07.285Z",
    "eligible": true,
    "source": "DEVELOPER",
    "sourceRef": "a document observed as ARCHIVED must not later be observed as PUBLISHED within the same fresh trial"
  },
  "bestJourney": {
    "dependencies": [
      {
        "consumer": "archived",
        "producer": "step-create",
        "variable": "docId"
      },
      {
        "consumer": "later",
        "producer": "step-create",
        "variable": "docId"
      }
    ],
    "id": "35d57559-c518-4c1f-b8be-57d8d3bc49eb",
    "predicateRef": {
      "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
      "id": "ca808641-16b4-43e1-8a6c-04c5e04cb777",
      "version": 1
    },
    "rationale": "Journey covering document creation, archiving, and subsequent attempt to publish, satisfying the approved predicate reference.",
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
              "stepId": "step-create"
            }
          }
        ],
        "id": "step-create",
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
              "kind": "variable",
              "name": "docId"
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
              "kind": "variable",
              "name": "docId"
            }
          }
        ]
      }
    ],
    "variables": []
  },
  "bestLength": 3,
  "executionProvenance": {
    "acceptedAt": "2026-10-01T22:22:07.285Z",
    "deadlineAt": "2026-10-01T22:32:07.285Z",
    "runId": "4955db90-2adc-4e42-a151-92ea570be034",
    "trialIds": [
      "58475fe2-8954-4833-9e95-1e4f728924d4",
      "100a0737-8df7-4d55-a5e1-b1b81c3dfe76"
    ]
  },
  "finding": {
    "classification": "CONFIRMED",
    "consistent": true,
    "id": "674a2692-e342-4a29-ac8a-919e870db6b2",
    "initialEvidenceId": "dc615084-c643-4fed-8705-61c1e1ea6d3f",
    "minimizationStop": "LOCAL MINIMUM",
    "minimizedJourneyId": "35d57559-c518-4c1f-b8be-57d8d3bc49eb",
    "originalJourneyId": "35d57559-c518-4c1f-b8be-57d8d3bc49eb",
    "predicateRef": {
      "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
      "id": "ca808641-16b4-43e1-8a6c-04c5e04cb777",
      "version": 1
    },
    "projectId": "a7fb6887-af01-4663-93a6-673f90227681",
    "replayEvidenceIds": [
      "f10877be-1055-47ad-8d64-943ec81d04f1"
    ],
    "transitions": [
      {
        "evidenceRefs": [
          "dc615084-c643-4fed-8705-61c1e1ea6d3f"
        ],
        "next": "OBSERVED VIOLATION",
        "prior": null,
        "reason": "INITIAL PREDICATE VIOLATION"
      },
      {
        "evidenceRefs": [
          "dc615084-c643-4fed-8705-61c1e1ea6d3f",
          "f10877be-1055-47ad-8d64-943ec81d04f1"
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
        "4d41d4a3-b55f-4f44-accd-f7f2b15f91d0"
      ],
      "checkStepIds": [
        "baseline"
      ],
      "id": "760dfbb2-ad5f-434d-951a-b686d50abbbd",
      "resetStepIds": [
        "reset"
      ],
      "runId": "4955db90-2adc-4e42-a151-92ea570be034",
      "trialId": "58475fe2-8954-4833-9e95-1e4f728924d4",
      "verdict": "SATISFIED"
    },
    "evidence": {
      "baselineEvidenceId": "760dfbb2-ad5f-434d-951a-b686d50abbbd",
      "id": "dc615084-c643-4fed-8705-61c1e1ea6d3f",
      "observationIds": [
        "2ace97dc-ff71-4437-88f8-2f74f8771ddd",
        "059564de-5fa9-4651-ba98-8deee3a22ad7",
        "42017aa2-efab-407a-8f8d-08f739d1bbe3"
      ],
      "outcome": "VIOLATED",
      "phase": "EXPLORATION",
      "predicateRef": {
        "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
        "id": "ca808641-16b4-43e1-8a6c-04c5e04cb777",
        "version": 1
      },
      "runId": "4955db90-2adc-4e42-a151-92ea570be034",
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
            "stepId": "step-create"
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
      "trialId": "58475fe2-8954-4833-9e95-1e4f728924d4"
    },
    "observations": [
      {
        "id": "42017aa2-efab-407a-8f8d-08f739d1bbe3",
        "result": {
          "elapsedMs": 1.7515000000130385,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/documents",
            "url": "http://127.0.0.1:54363/api/documents"
          },
          "sanitizedResponse": {
            "body": {
              "id": "d765d204-bd51-4542-bbfb-b5d46da4e01f",
              "state": "DRAFT"
            },
            "elapsedMs": 1.7515000000130385,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 22:22:11 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 201,
            "text": "{\"id\":\"d765d204-bd51-4542-bbfb-b5d46da4e01f\",\"state\":\"DRAFT\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T22:22:11.913Z",
          "status": 201,
          "stepId": "step-create",
          "truncated": false
        },
        "runId": "4955db90-2adc-4e42-a151-92ea570be034",
        "stateMappings": [],
        "stepId": "step-create",
        "trialId": "58475fe2-8954-4833-9e95-1e4f728924d4"
      },
      {
        "id": "059564de-5fa9-4651-ba98-8deee3a22ad7",
        "result": {
          "elapsedMs": 1.611750000010943,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/documents/{documentId}/archive",
            "url": "http://127.0.0.1:54363/api/documents/d765d204-bd51-4542-bbfb-b5d46da4e01f/archive"
          },
          "sanitizedResponse": {
            "body": {
              "id": "d765d204-bd51-4542-bbfb-b5d46da4e01f",
              "state": "ARCHIVED"
            },
            "elapsedMs": 1.611750000010943,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 22:22:11 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"d765d204-bd51-4542-bbfb-b5d46da4e01f\",\"state\":\"ARCHIVED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T22:22:11.919Z",
          "status": 200,
          "stepId": "archived",
          "truncated": false
        },
        "runId": "4955db90-2adc-4e42-a151-92ea570be034",
        "stateMappings": [],
        "stepId": "archived",
        "trialId": "58475fe2-8954-4833-9e95-1e4f728924d4"
      },
      {
        "id": "2ace97dc-ff71-4437-88f8-2f74f8771ddd",
        "result": {
          "elapsedMs": 1.9028330000001006,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/documents/{documentId}/publish",
            "url": "http://127.0.0.1:54363/api/documents/d765d204-bd51-4542-bbfb-b5d46da4e01f/publish"
          },
          "sanitizedResponse": {
            "body": {
              "id": "d765d204-bd51-4542-bbfb-b5d46da4e01f",
              "state": "PUBLISHED"
            },
            "elapsedMs": 1.9028330000001006,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 22:22:11 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"d765d204-bd51-4542-bbfb-b5d46da4e01f\",\"state\":\"PUBLISHED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T22:22:11.924Z",
          "status": 200,
          "stepId": "later",
          "truncated": false
        },
        "runId": "4955db90-2adc-4e42-a151-92ea570be034",
        "stateMappings": [],
        "stepId": "later",
        "trialId": "58475fe2-8954-4833-9e95-1e4f728924d4"
      }
    ]
  },
  "minimization": {
    "attempts": [
      {
        "accepted": false,
        "candidate": {
          "dependencies": [],
          "id": "cb559b5b-809d-442d-bed8-1f57d44e692c",
          "predicateRef": {
            "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
            "id": "ca808641-16b4-43e1-8a6c-04c5e04cb777",
            "version": 1
          },
          "rationale": "Journey covering document creation, archiving, and subsequent attempt to publish, satisfying the approved predicate reference.",
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
                    "kind": "variable",
                    "name": "docId"
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
                    "kind": "variable",
                    "name": "docId"
                  }
                }
              ]
            }
          ],
          "variables": []
        },
        "observations": [],
        "reason": "PRODUCER REQUIRED",
        "removedStepId": "step-create"
      },
      {
        "accepted": false,
        "candidate": {
          "dependencies": [
            {
              "consumer": "later",
              "producer": "step-create",
              "variable": "docId"
            }
          ],
          "id": "334f14e8-3d5c-44d4-9b69-a16e66836ce7",
          "predicateRef": {
            "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
            "id": "ca808641-16b4-43e1-8a6c-04c5e04cb777",
            "version": 1
          },
          "rationale": "Journey covering document creation, archiving, and subsequent attempt to publish, satisfying the approved predicate reference.",
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
                    "stepId": "step-create"
                  }
                }
              ],
              "id": "step-create",
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
                    "kind": "variable",
                    "name": "docId"
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
              "producer": "step-create",
              "variable": "docId"
            }
          ],
          "id": "e091d257-65fa-4356-8132-13a9e3497341",
          "predicateRef": {
            "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
            "id": "ca808641-16b4-43e1-8a6c-04c5e04cb777",
            "version": 1
          },
          "rationale": "Journey covering document creation, archiving, and subsequent attempt to publish, satisfying the approved predicate reference.",
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
                    "stepId": "step-create"
                  }
                }
              ],
              "id": "step-create",
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
                    "kind": "variable",
                    "name": "docId"
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
          "producer": "step-create",
          "variable": "docId"
        },
        {
          "consumer": "later",
          "producer": "step-create",
          "variable": "docId"
        }
      ],
      "id": "35d57559-c518-4c1f-b8be-57d8d3bc49eb",
      "predicateRef": {
        "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
        "id": "ca808641-16b4-43e1-8a6c-04c5e04cb777",
        "version": 1
      },
      "rationale": "Journey covering document creation, archiving, and subsequent attempt to publish, satisfying the approved predicate reference.",
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
                "stepId": "step-create"
              }
            }
          ],
          "id": "step-create",
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
                "kind": "variable",
                "name": "docId"
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
                "kind": "variable",
                "name": "docId"
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
      "id": "674a2692-e342-4a29-ac8a-919e870db6b2",
      "initialEvidenceId": "dc615084-c643-4fed-8705-61c1e1ea6d3f",
      "minimizationStop": "LOCAL MINIMUM",
      "minimizedJourneyId": "35d57559-c518-4c1f-b8be-57d8d3bc49eb",
      "originalJourneyId": "35d57559-c518-4c1f-b8be-57d8d3bc49eb",
      "predicateRef": {
        "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
        "id": "ca808641-16b4-43e1-8a6c-04c5e04cb777",
        "version": 1
      },
      "projectId": "a7fb6887-af01-4663-93a6-673f90227681",
      "replayEvidenceIds": [
        "f10877be-1055-47ad-8d64-943ec81d04f1"
      ],
      "transitions": [
        {
          "evidenceRefs": [
            "dc615084-c643-4fed-8705-61c1e1ea6d3f"
          ],
          "next": "OBSERVED VIOLATION",
          "prior": null,
          "reason": "INITIAL PREDICATE VIOLATION"
        },
        {
          "evidenceRefs": [
            "dc615084-c643-4fed-8705-61c1e1ea6d3f",
            "f10877be-1055-47ad-8d64-943ec81d04f1"
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
        "producer": "step-create",
        "variable": "docId"
      },
      {
        "consumer": "later",
        "producer": "step-create",
        "variable": "docId"
      }
    ],
    "id": "35d57559-c518-4c1f-b8be-57d8d3bc49eb",
    "predicateRef": {
      "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
      "id": "ca808641-16b4-43e1-8a6c-04c5e04cb777",
      "version": 1
    },
    "rationale": "Journey covering document creation, archiving, and subsequent attempt to publish, satisfying the approved predicate reference.",
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
              "stepId": "step-create"
            }
          }
        ],
        "id": "step-create",
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
              "kind": "variable",
              "name": "docId"
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
              "kind": "variable",
              "name": "docId"
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
    "id": "ca808641-16b4-43e1-8a6c-04c5e04cb777",
    "source": "DEVELOPER",
    "sourceRef": "a document observed as ARCHIVED must not later be observed as PUBLISHED within the same fresh trial",
    "version": 1
  },
  "predicateRef": {
    "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
    "id": "ca808641-16b4-43e1-8a6c-04c5e04cb777",
    "version": 1
  },
  "replays": [
    {
      "baseline": {
        "assertionIds": [
          "4d41d4a3-b55f-4f44-accd-f7f2b15f91d0"
        ],
        "checkStepIds": [
          "baseline"
        ],
        "id": "8a815d1b-e3f3-4284-aa10-4d6f4033e839",
        "resetStepIds": [
          "reset"
        ],
        "runId": "4955db90-2adc-4e42-a151-92ea570be034",
        "trialId": "100a0737-8df7-4d55-a5e1-b1b81c3dfe76",
        "verdict": "SATISFIED"
      },
      "evidence": {
        "baselineEvidenceId": "8a815d1b-e3f3-4284-aa10-4d6f4033e839",
        "id": "f10877be-1055-47ad-8d64-943ec81d04f1",
        "observationIds": [
          "b5c44d62-0ff0-4fd1-a6cc-4f3293e93884",
          "729fe20b-6c57-415d-8428-fbe3a6766c27",
          "9bd0cb12-eb20-47e0-85ce-ce4c95e9c566"
        ],
        "outcome": "VIOLATED",
        "phase": "REPLAY",
        "predicateRef": {
          "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
          "id": "ca808641-16b4-43e1-8a6c-04c5e04cb777",
          "version": 1
        },
        "runId": "4955db90-2adc-4e42-a151-92ea570be034",
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
              "stepId": "step-create"
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
        "trialId": "100a0737-8df7-4d55-a5e1-b1b81c3dfe76"
      },
      "observations": [
        {
          "id": "729fe20b-6c57-415d-8428-fbe3a6766c27",
          "result": {
            "elapsedMs": 1.1762919999891892,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/documents",
              "url": "http://127.0.0.1:54363/api/documents"
            },
            "sanitizedResponse": {
              "body": {
                "id": "34231c1a-9f1a-4dfb-ba2f-848f60da6cf8",
                "state": "DRAFT"
              },
              "elapsedMs": 1.1762919999891892,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 22:22:11 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 201,
              "text": "{\"id\":\"34231c1a-9f1a-4dfb-ba2f-848f60da6cf8\",\"state\":\"DRAFT\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T22:22:11.958Z",
            "status": 201,
            "stepId": "step-create",
            "truncated": false
          },
          "runId": "4955db90-2adc-4e42-a151-92ea570be034",
          "stateMappings": [],
          "stepId": "step-create",
          "trialId": "100a0737-8df7-4d55-a5e1-b1b81c3dfe76"
        },
        {
          "id": "b5c44d62-0ff0-4fd1-a6cc-4f3293e93884",
          "result": {
            "elapsedMs": 2.025500000017928,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/documents/{documentId}/archive",
              "url": "http://127.0.0.1:54363/api/documents/34231c1a-9f1a-4dfb-ba2f-848f60da6cf8/archive"
            },
            "sanitizedResponse": {
              "body": {
                "id": "34231c1a-9f1a-4dfb-ba2f-848f60da6cf8",
                "state": "ARCHIVED"
              },
              "elapsedMs": 2.025500000017928,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 22:22:11 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"34231c1a-9f1a-4dfb-ba2f-848f60da6cf8\",\"state\":\"ARCHIVED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T22:22:11.961Z",
            "status": 200,
            "stepId": "archived",
            "truncated": false
          },
          "runId": "4955db90-2adc-4e42-a151-92ea570be034",
          "stateMappings": [],
          "stepId": "archived",
          "trialId": "100a0737-8df7-4d55-a5e1-b1b81c3dfe76"
        },
        {
          "id": "9bd0cb12-eb20-47e0-85ce-ce4c95e9c566",
          "result": {
            "elapsedMs": 2.2824580000014976,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/documents/{documentId}/publish",
              "url": "http://127.0.0.1:54363/api/documents/34231c1a-9f1a-4dfb-ba2f-848f60da6cf8/publish"
            },
            "sanitizedResponse": {
              "body": {
                "id": "34231c1a-9f1a-4dfb-ba2f-848f60da6cf8",
                "state": "PUBLISHED"
              },
              "elapsedMs": 2.2824580000014976,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 22:22:11 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"34231c1a-9f1a-4dfb-ba2f-848f60da6cf8\",\"state\":\"PUBLISHED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T22:22:11.968Z",
            "status": 200,
            "stepId": "later",
            "truncated": false
          },
          "runId": "4955db90-2adc-4e42-a151-92ea570be034",
          "stateMappings": [],
          "stepId": "later",
          "trialId": "100a0737-8df7-4d55-a5e1-b1b81c3dfe76"
        }
      ]
    }
  ],
  "reproductionClaim": "shortest verified sequence found",
  "runId": "4955db90-2adc-4e42-a151-92ea570be034",
  "setup": "Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.",
  "stopReason": "LOCAL MINIMUM",
  "truncated": false,
  "verification": "UNVERIFIED"
}
```
