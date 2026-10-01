# GhostQA finding evidence

Finding: `aa05e237-f665-4462-916e-fa278783b98c` — CONFIRMED
Evidence chain: OBSERVED VIOLATION → CONFIRMED → best verified reproducer.
Consistency: true. Artifact: GENERATED / UNVERIFIED.

Predicate: `ad4fcd4b-223a-45bb-9575-998e2e468343`, version 1, canonical hash `ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d`.
Approval provenance: DEVELOPER; source `an order observed as CANCELLED must not later be observed as FULFILLED within the same fresh trial`; eligible as of run acceptance: true.

Original journey length: 3. Best verified journey length: 3.
This is the shortest verified sequence found.
It is locally irreducible under attempted deletion strategy.
Local minimization stop reason: LOCAL MINIMUM.
Truncated: no.

## Expected invariant

When the applicability conditions hold, every approved assertion must be satisfied:

- `{"kind":"json","pointer":"/state","stepId":"later"}` not-equals `{"kind":"literal","value":"FULFILLED"}`

## Evidence references

- EXPLORATION: evidence `c8f32b50-e432-49a3-8f86-f44f997b4457`, trial `dffeab3c-cf9c-465f-a37d-f3d2fd6cd1c0`, baseline `12aa3602-051d-4854-889a-5b2d0bfa0a5c`, verdict VIOLATED.
- REPLAY: evidence `4262c789-41e4-4035-b4f6-ce55b4e2d65c`, trial `bf141d50-375c-48ba-8709-b20b98e3caa9`, baseline `248c4795-af2f-4e21-a3e5-0d88663f2901`, verdict VIOLATED.

## Minimized reproduction

1. `step1` — `POST /api/orders`
2. `cancelled` — `POST /api/orders/{orderId}/cancel`
3. `later` — `POST /api/orders/{orderId}/fulfill`

## Minimized attempt history

- Remove `step1`: rejected; PRODUCER REQUIRED; candidate `eaa4a042-6940-444b-8cd0-33a62590f314`.
- Remove `cancelled`: rejected; PREDICATE STEP REQUIRED; candidate `66c6cb9b-2521-4e0a-89db-21221a00a896`.
- Remove `later`: rejected; PREDICATE STEP REQUIRED; candidate `ebde4098-73d8-4a08-915f-4ed960fb7185`.

## Setup and verification

Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.
Generation does not establish supervised verification. This manifest has not been verified through the originating run.

## Exact assertions and sanitized evidence

```json
{
  "approval": {
    "asOf": "2026-10-01T20:40:44.031Z",
    "eligible": true,
    "source": "DEVELOPER",
    "sourceRef": "an order observed as CANCELLED must not later be observed as FULFILLED within the same fresh trial"
  },
  "bestJourney": {
    "dependencies": [
      {
        "consumer": "cancelled",
        "producer": "step1",
        "variable": "orderId"
      },
      {
        "consumer": "later",
        "producer": "step1",
        "variable": "orderId"
      }
    ],
    "id": "8198b6e0-6358-4cac-9889-88f1320af9f1",
    "predicateRef": {
      "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
      "id": "ad4fcd4b-223a-45bb-9575-998e2e468343",
      "version": 1
    },
    "rationale": "Verifies that an order observed as cancelled cannot subsequently be fulfilled, adhering to the approved predicate definition.",
    "steps": [
      {
        "bodyBindings": [],
        "expectedStatuses": [
          201
        ],
        "extracts": [
          {
            "expectedType": "string",
            "name": "orderId",
            "sensitive": false,
            "source": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "step1"
            }
          }
        ],
        "id": "step1",
        "operationId": "POST /api/orders",
        "parameters": []
      },
      {
        "bodyBindings": [],
        "expectedStatuses": [
          200
        ],
        "extracts": [],
        "id": "cancelled",
        "operationId": "POST /api/orders/{orderId}/cancel",
        "parameters": [
          {
            "location": "path",
            "name": "orderId",
            "value": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "step1"
            }
          }
        ]
      },
      {
        "bodyBindings": [],
        "expectedStatuses": [
          409
        ],
        "extracts": [],
        "id": "later",
        "operationId": "POST /api/orders/{orderId}/fulfill",
        "parameters": [
          {
            "location": "path",
            "name": "orderId",
            "value": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "step1"
            }
          }
        ]
      }
    ],
    "variables": []
  },
  "bestLength": 3,
  "executionProvenance": {
    "acceptedAt": "2026-10-01T20:40:44.031Z",
    "deadlineAt": "2026-10-01T20:50:44.031Z",
    "runId": "bce853ab-b10d-49fc-9aa7-f834d1c9bc77",
    "trialIds": [
      "dffeab3c-cf9c-465f-a37d-f3d2fd6cd1c0",
      "bf141d50-375c-48ba-8709-b20b98e3caa9"
    ]
  },
  "finding": {
    "classification": "CONFIRMED",
    "consistent": true,
    "id": "aa05e237-f665-4462-916e-fa278783b98c",
    "initialEvidenceId": "c8f32b50-e432-49a3-8f86-f44f997b4457",
    "minimizationStop": "LOCAL MINIMUM",
    "minimizedJourneyId": "8198b6e0-6358-4cac-9889-88f1320af9f1",
    "originalJourneyId": "8198b6e0-6358-4cac-9889-88f1320af9f1",
    "predicateRef": {
      "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
      "id": "ad4fcd4b-223a-45bb-9575-998e2e468343",
      "version": 1
    },
    "projectId": "ed039fb3-efe7-4cbe-92a7-445afc36ae60",
    "replayEvidenceIds": [
      "4262c789-41e4-4035-b4f6-ce55b4e2d65c"
    ],
    "transitions": [
      {
        "evidenceRefs": [
          "c8f32b50-e432-49a3-8f86-f44f997b4457"
        ],
        "next": "OBSERVED VIOLATION",
        "prior": null,
        "reason": "INITIAL PREDICATE VIOLATION"
      },
      {
        "evidenceRefs": [
          "c8f32b50-e432-49a3-8f86-f44f997b4457",
          "4262c789-41e4-4035-b4f6-ce55b4e2d65c"
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
        "caf4c523-f8d9-4805-a84c-558638044b06"
      ],
      "checkStepIds": [
        "baseline"
      ],
      "id": "12aa3602-051d-4854-889a-5b2d0bfa0a5c",
      "resetStepIds": [
        "reset"
      ],
      "runId": "bce853ab-b10d-49fc-9aa7-f834d1c9bc77",
      "trialId": "dffeab3c-cf9c-465f-a37d-f3d2fd6cd1c0",
      "verdict": "SATISFIED"
    },
    "evidence": {
      "baselineEvidenceId": "12aa3602-051d-4854-889a-5b2d0bfa0a5c",
      "id": "c8f32b50-e432-49a3-8f86-f44f997b4457",
      "observationIds": [
        "e877c113-f144-45ec-8092-6742c17dc72e",
        "baef3335-1de5-4a64-bf87-0906769899ba",
        "10530cd5-5a9d-40ad-9007-9cd7a7bd41e7"
      ],
      "outcome": "VIOLATED",
      "phase": "EXPLORATION",
      "predicateRef": {
        "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
        "id": "ad4fcd4b-223a-45bb-9575-998e2e468343",
        "version": 1
      },
      "runId": "bce853ab-b10d-49fc-9aa7-f834d1c9bc77",
      "symbolicOperands": {
        "applicability": [
          {
            "left": {
              "kind": "json",
              "pointer": "/state",
              "stepId": "cancelled"
            },
            "op": "equals",
            "right": {
              "kind": "literal",
              "value": "CANCELLED"
            }
          },
          {
            "left": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "cancelled"
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
              "stepId": "cancelled"
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
              "value": "FULFILLED"
            }
          }
        ],
        "executionOrder": [
          {
            "operationId": "POST /api/orders",
            "ordinal": 0,
            "stepId": "step1"
          },
          {
            "operationId": "POST /api/orders/{orderId}/cancel",
            "ordinal": 1,
            "stepId": "cancelled"
          },
          {
            "operationId": "POST /api/orders/{orderId}/fulfill",
            "ordinal": 2,
            "stepId": "later"
          }
        ]
      },
      "trialId": "dffeab3c-cf9c-465f-a37d-f3d2fd6cd1c0"
    },
    "observations": [
      {
        "id": "baef3335-1de5-4a64-bf87-0906769899ba",
        "result": {
          "elapsedMs": 1.2940839999992022,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/orders",
            "url": "http://127.0.0.1:65140/api/orders"
          },
          "sanitizedResponse": {
            "body": {
              "id": "38594262-dab6-4ced-99e0-3fdf0060fc02",
              "state": "CREATED"
            },
            "elapsedMs": 1.2940839999992022,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 20:40:47 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 201,
            "text": "{\"id\":\"38594262-dab6-4ced-99e0-3fdf0060fc02\",\"state\":\"CREATED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T20:40:47.516Z",
          "status": 201,
          "stepId": "step1",
          "truncated": false
        },
        "runId": "bce853ab-b10d-49fc-9aa7-f834d1c9bc77",
        "stateMappings": [],
        "stepId": "step1",
        "trialId": "dffeab3c-cf9c-465f-a37d-f3d2fd6cd1c0"
      },
      {
        "id": "10530cd5-5a9d-40ad-9007-9cd7a7bd41e7",
        "result": {
          "elapsedMs": 1.3586250000007567,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/orders/{orderId}/cancel",
            "url": "http://127.0.0.1:65140/api/orders/38594262-dab6-4ced-99e0-3fdf0060fc02/cancel"
          },
          "sanitizedResponse": {
            "body": {
              "id": "38594262-dab6-4ced-99e0-3fdf0060fc02",
              "state": "CANCELLED"
            },
            "elapsedMs": 1.3586250000007567,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 20:40:47 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"38594262-dab6-4ced-99e0-3fdf0060fc02\",\"state\":\"CANCELLED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T20:40:47.523Z",
          "status": 200,
          "stepId": "cancelled",
          "truncated": false
        },
        "runId": "bce853ab-b10d-49fc-9aa7-f834d1c9bc77",
        "stateMappings": [],
        "stepId": "cancelled",
        "trialId": "dffeab3c-cf9c-465f-a37d-f3d2fd6cd1c0"
      },
      {
        "id": "e877c113-f144-45ec-8092-6742c17dc72e",
        "result": {
          "elapsedMs": 1.396333999999115,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/orders/{orderId}/fulfill",
            "url": "http://127.0.0.1:65140/api/orders/38594262-dab6-4ced-99e0-3fdf0060fc02/fulfill"
          },
          "sanitizedResponse": {
            "body": {
              "id": "38594262-dab6-4ced-99e0-3fdf0060fc02",
              "state": "FULFILLED"
            },
            "elapsedMs": 1.396333999999115,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 20:40:47 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"38594262-dab6-4ced-99e0-3fdf0060fc02\",\"state\":\"FULFILLED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T20:40:47.530Z",
          "status": 200,
          "stepId": "later",
          "truncated": false
        },
        "runId": "bce853ab-b10d-49fc-9aa7-f834d1c9bc77",
        "stateMappings": [],
        "stepId": "later",
        "trialId": "dffeab3c-cf9c-465f-a37d-f3d2fd6cd1c0"
      }
    ]
  },
  "minimization": {
    "attempts": [
      {
        "accepted": false,
        "candidate": {
          "dependencies": [],
          "id": "eaa4a042-6940-444b-8cd0-33a62590f314",
          "predicateRef": {
            "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
            "id": "ad4fcd4b-223a-45bb-9575-998e2e468343",
            "version": 1
          },
          "rationale": "Verifies that an order observed as cancelled cannot subsequently be fulfilled, adhering to the approved predicate definition.",
          "steps": [
            {
              "bodyBindings": [],
              "expectedStatuses": [
                200
              ],
              "extracts": [],
              "id": "cancelled",
              "operationId": "POST /api/orders/{orderId}/cancel",
              "parameters": [
                {
                  "location": "path",
                  "name": "orderId",
                  "value": {
                    "kind": "json",
                    "pointer": "/id",
                    "stepId": "step1"
                  }
                }
              ]
            },
            {
              "bodyBindings": [],
              "expectedStatuses": [
                409
              ],
              "extracts": [],
              "id": "later",
              "operationId": "POST /api/orders/{orderId}/fulfill",
              "parameters": [
                {
                  "location": "path",
                  "name": "orderId",
                  "value": {
                    "kind": "json",
                    "pointer": "/id",
                    "stepId": "step1"
                  }
                }
              ]
            }
          ],
          "variables": []
        },
        "observations": [],
        "reason": "PRODUCER REQUIRED",
        "removedStepId": "step1"
      },
      {
        "accepted": false,
        "candidate": {
          "dependencies": [
            {
              "consumer": "later",
              "producer": "step1",
              "variable": "orderId"
            }
          ],
          "id": "66c6cb9b-2521-4e0a-89db-21221a00a896",
          "predicateRef": {
            "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
            "id": "ad4fcd4b-223a-45bb-9575-998e2e468343",
            "version": 1
          },
          "rationale": "Verifies that an order observed as cancelled cannot subsequently be fulfilled, adhering to the approved predicate definition.",
          "steps": [
            {
              "bodyBindings": [],
              "expectedStatuses": [
                201
              ],
              "extracts": [
                {
                  "expectedType": "string",
                  "name": "orderId",
                  "sensitive": false,
                  "source": {
                    "kind": "json",
                    "pointer": "/id",
                    "stepId": "step1"
                  }
                }
              ],
              "id": "step1",
              "operationId": "POST /api/orders",
              "parameters": []
            },
            {
              "bodyBindings": [],
              "expectedStatuses": [
                409
              ],
              "extracts": [],
              "id": "later",
              "operationId": "POST /api/orders/{orderId}/fulfill",
              "parameters": [
                {
                  "location": "path",
                  "name": "orderId",
                  "value": {
                    "kind": "json",
                    "pointer": "/id",
                    "stepId": "step1"
                  }
                }
              ]
            }
          ],
          "variables": []
        },
        "observations": [],
        "reason": "PREDICATE STEP REQUIRED",
        "removedStepId": "cancelled"
      },
      {
        "accepted": false,
        "candidate": {
          "dependencies": [
            {
              "consumer": "cancelled",
              "producer": "step1",
              "variable": "orderId"
            }
          ],
          "id": "ebde4098-73d8-4a08-915f-4ed960fb7185",
          "predicateRef": {
            "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
            "id": "ad4fcd4b-223a-45bb-9575-998e2e468343",
            "version": 1
          },
          "rationale": "Verifies that an order observed as cancelled cannot subsequently be fulfilled, adhering to the approved predicate definition.",
          "steps": [
            {
              "bodyBindings": [],
              "expectedStatuses": [
                201
              ],
              "extracts": [
                {
                  "expectedType": "string",
                  "name": "orderId",
                  "sensitive": false,
                  "source": {
                    "kind": "json",
                    "pointer": "/id",
                    "stepId": "step1"
                  }
                }
              ],
              "id": "step1",
              "operationId": "POST /api/orders",
              "parameters": []
            },
            {
              "bodyBindings": [],
              "expectedStatuses": [
                200
              ],
              "extracts": [],
              "id": "cancelled",
              "operationId": "POST /api/orders/{orderId}/cancel",
              "parameters": [
                {
                  "location": "path",
                  "name": "orderId",
                  "value": {
                    "kind": "json",
                    "pointer": "/id",
                    "stepId": "step1"
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
          "consumer": "cancelled",
          "producer": "step1",
          "variable": "orderId"
        },
        {
          "consumer": "later",
          "producer": "step1",
          "variable": "orderId"
        }
      ],
      "id": "8198b6e0-6358-4cac-9889-88f1320af9f1",
      "predicateRef": {
        "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
        "id": "ad4fcd4b-223a-45bb-9575-998e2e468343",
        "version": 1
      },
      "rationale": "Verifies that an order observed as cancelled cannot subsequently be fulfilled, adhering to the approved predicate definition.",
      "steps": [
        {
          "bodyBindings": [],
          "expectedStatuses": [
            201
          ],
          "extracts": [
            {
              "expectedType": "string",
              "name": "orderId",
              "sensitive": false,
              "source": {
                "kind": "json",
                "pointer": "/id",
                "stepId": "step1"
              }
            }
          ],
          "id": "step1",
          "operationId": "POST /api/orders",
          "parameters": []
        },
        {
          "bodyBindings": [],
          "expectedStatuses": [
            200
          ],
          "extracts": [],
          "id": "cancelled",
          "operationId": "POST /api/orders/{orderId}/cancel",
          "parameters": [
            {
              "location": "path",
              "name": "orderId",
              "value": {
                "kind": "json",
                "pointer": "/id",
                "stepId": "step1"
              }
            }
          ]
        },
        {
          "bodyBindings": [],
          "expectedStatuses": [
            409
          ],
          "extracts": [],
          "id": "later",
          "operationId": "POST /api/orders/{orderId}/fulfill",
          "parameters": [
            {
              "location": "path",
              "name": "orderId",
              "value": {
                "kind": "json",
                "pointer": "/id",
                "stepId": "step1"
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
      "id": "aa05e237-f665-4462-916e-fa278783b98c",
      "initialEvidenceId": "c8f32b50-e432-49a3-8f86-f44f997b4457",
      "minimizationStop": "LOCAL MINIMUM",
      "minimizedJourneyId": "8198b6e0-6358-4cac-9889-88f1320af9f1",
      "originalJourneyId": "8198b6e0-6358-4cac-9889-88f1320af9f1",
      "predicateRef": {
        "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
        "id": "ad4fcd4b-223a-45bb-9575-998e2e468343",
        "version": 1
      },
      "projectId": "ed039fb3-efe7-4cbe-92a7-445afc36ae60",
      "replayEvidenceIds": [
        "4262c789-41e4-4035-b4f6-ce55b4e2d65c"
      ],
      "transitions": [
        {
          "evidenceRefs": [
            "c8f32b50-e432-49a3-8f86-f44f997b4457"
          ],
          "next": "OBSERVED VIOLATION",
          "prior": null,
          "reason": "INITIAL PREDICATE VIOLATION"
        },
        {
          "evidenceRefs": [
            "c8f32b50-e432-49a3-8f86-f44f997b4457",
            "4262c789-41e4-4035-b4f6-ce55b4e2d65c"
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
        "consumer": "cancelled",
        "producer": "step1",
        "variable": "orderId"
      },
      {
        "consumer": "later",
        "producer": "step1",
        "variable": "orderId"
      }
    ],
    "id": "8198b6e0-6358-4cac-9889-88f1320af9f1",
    "predicateRef": {
      "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
      "id": "ad4fcd4b-223a-45bb-9575-998e2e468343",
      "version": 1
    },
    "rationale": "Verifies that an order observed as cancelled cannot subsequently be fulfilled, adhering to the approved predicate definition.",
    "steps": [
      {
        "bodyBindings": [],
        "expectedStatuses": [
          201
        ],
        "extracts": [
          {
            "expectedType": "string",
            "name": "orderId",
            "sensitive": false,
            "source": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "step1"
            }
          }
        ],
        "id": "step1",
        "operationId": "POST /api/orders",
        "parameters": []
      },
      {
        "bodyBindings": [],
        "expectedStatuses": [
          200
        ],
        "extracts": [],
        "id": "cancelled",
        "operationId": "POST /api/orders/{orderId}/cancel",
        "parameters": [
          {
            "location": "path",
            "name": "orderId",
            "value": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "step1"
            }
          }
        ]
      },
      {
        "bodyBindings": [],
        "expectedStatuses": [
          409
        ],
        "extracts": [],
        "id": "later",
        "operationId": "POST /api/orders/{orderId}/fulfill",
        "parameters": [
          {
            "location": "path",
            "name": "orderId",
            "value": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "step1"
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
          "stepId": "cancelled"
        },
        "op": "equals",
        "right": {
          "kind": "literal",
          "value": "CANCELLED"
        }
      },
      {
        "left": {
          "kind": "json",
          "pointer": "/id",
          "stepId": "cancelled"
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
          "stepId": "cancelled"
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
          "value": "FULFILLED"
        }
      }
    ],
    "canonicalHash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
    "id": "ad4fcd4b-223a-45bb-9575-998e2e468343",
    "source": "DEVELOPER",
    "sourceRef": "an order observed as CANCELLED must not later be observed as FULFILLED within the same fresh trial",
    "version": 1
  },
  "predicateRef": {
    "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
    "id": "ad4fcd4b-223a-45bb-9575-998e2e468343",
    "version": 1
  },
  "replays": [
    {
      "baseline": {
        "assertionIds": [
          "caf4c523-f8d9-4805-a84c-558638044b06"
        ],
        "checkStepIds": [
          "baseline"
        ],
        "id": "248c4795-af2f-4e21-a3e5-0d88663f2901",
        "resetStepIds": [
          "reset"
        ],
        "runId": "bce853ab-b10d-49fc-9aa7-f834d1c9bc77",
        "trialId": "bf141d50-375c-48ba-8709-b20b98e3caa9",
        "verdict": "SATISFIED"
      },
      "evidence": {
        "baselineEvidenceId": "248c4795-af2f-4e21-a3e5-0d88663f2901",
        "id": "4262c789-41e4-4035-b4f6-ce55b4e2d65c",
        "observationIds": [
          "17b01bfe-f1ca-486d-b478-c2a79301f5e8",
          "4e705c9a-d334-4055-834e-9b2845b5e3ce",
          "591905b1-68eb-464a-a214-2da447febe5c"
        ],
        "outcome": "VIOLATED",
        "phase": "REPLAY",
        "predicateRef": {
          "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
          "id": "ad4fcd4b-223a-45bb-9575-998e2e468343",
          "version": 1
        },
        "runId": "bce853ab-b10d-49fc-9aa7-f834d1c9bc77",
        "symbolicOperands": {
          "applicability": [
            {
              "left": {
                "kind": "json",
                "pointer": "/state",
                "stepId": "cancelled"
              },
              "op": "equals",
              "right": {
                "kind": "literal",
                "value": "CANCELLED"
              }
            },
            {
              "left": {
                "kind": "json",
                "pointer": "/id",
                "stepId": "cancelled"
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
                "stepId": "cancelled"
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
                "value": "FULFILLED"
              }
            }
          ],
          "executionOrder": [
            {
              "operationId": "POST /api/orders",
              "ordinal": 0,
              "stepId": "step1"
            },
            {
              "operationId": "POST /api/orders/{orderId}/cancel",
              "ordinal": 1,
              "stepId": "cancelled"
            },
            {
              "operationId": "POST /api/orders/{orderId}/fulfill",
              "ordinal": 2,
              "stepId": "later"
            }
          ]
        },
        "trialId": "bf141d50-375c-48ba-8709-b20b98e3caa9"
      },
      "observations": [
        {
          "id": "591905b1-68eb-464a-a214-2da447febe5c",
          "result": {
            "elapsedMs": 1.773457999999664,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/orders",
              "url": "http://127.0.0.1:65140/api/orders"
            },
            "sanitizedResponse": {
              "body": {
                "id": "aafb2a85-db23-4d23-b8fb-f986839db326",
                "state": "CREATED"
              },
              "elapsedMs": 1.773457999999664,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 20:40:47 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 201,
              "text": "{\"id\":\"aafb2a85-db23-4d23-b8fb-f986839db326\",\"state\":\"CREATED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T20:40:47.583Z",
            "status": 201,
            "stepId": "step1",
            "truncated": false
          },
          "runId": "bce853ab-b10d-49fc-9aa7-f834d1c9bc77",
          "stateMappings": [],
          "stepId": "step1",
          "trialId": "bf141d50-375c-48ba-8709-b20b98e3caa9"
        },
        {
          "id": "17b01bfe-f1ca-486d-b478-c2a79301f5e8",
          "result": {
            "elapsedMs": 3.1212500000001455,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/orders/{orderId}/cancel",
              "url": "http://127.0.0.1:65140/api/orders/aafb2a85-db23-4d23-b8fb-f986839db326/cancel"
            },
            "sanitizedResponse": {
              "body": {
                "id": "aafb2a85-db23-4d23-b8fb-f986839db326",
                "state": "CANCELLED"
              },
              "elapsedMs": 3.1212500000001455,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 20:40:47 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"aafb2a85-db23-4d23-b8fb-f986839db326\",\"state\":\"CANCELLED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T20:40:47.590Z",
            "status": 200,
            "stepId": "cancelled",
            "truncated": false
          },
          "runId": "bce853ab-b10d-49fc-9aa7-f834d1c9bc77",
          "stateMappings": [],
          "stepId": "cancelled",
          "trialId": "bf141d50-375c-48ba-8709-b20b98e3caa9"
        },
        {
          "id": "4e705c9a-d334-4055-834e-9b2845b5e3ce",
          "result": {
            "elapsedMs": 1.2539170000000013,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/orders/{orderId}/fulfill",
              "url": "http://127.0.0.1:65140/api/orders/aafb2a85-db23-4d23-b8fb-f986839db326/fulfill"
            },
            "sanitizedResponse": {
              "body": {
                "id": "aafb2a85-db23-4d23-b8fb-f986839db326",
                "state": "FULFILLED"
              },
              "elapsedMs": 1.2539170000000013,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 20:40:47 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"aafb2a85-db23-4d23-b8fb-f986839db326\",\"state\":\"FULFILLED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T20:40:47.599Z",
            "status": 200,
            "stepId": "later",
            "truncated": false
          },
          "runId": "bce853ab-b10d-49fc-9aa7-f834d1c9bc77",
          "stateMappings": [],
          "stepId": "later",
          "trialId": "bf141d50-375c-48ba-8709-b20b98e3caa9"
        }
      ]
    }
  ],
  "reproductionClaim": "shortest verified sequence found",
  "runId": "bce853ab-b10d-49fc-9aa7-f834d1c9bc77",
  "setup": "Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.",
  "stopReason": "LOCAL MINIMUM",
  "truncated": false,
  "verification": "UNVERIFIED"
}
```
