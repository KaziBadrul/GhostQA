# GhostQA finding evidence

Finding: `f22a27e5-1f60-4a26-bbaf-9bed6b3fe791` — CONFIRMED
Evidence chain: OBSERVED VIOLATION → CONFIRMED → best verified reproducer.
Consistency: true. Artifact: GENERATED / UNVERIFIED.

Predicate: `5b1e45d8-3218-4f3c-a258-e31b68e16b88`, version 1, canonical hash `ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d`.
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

- EXPLORATION: evidence `9410c1d6-3df9-48c0-9fb8-f33c8b634200`, trial `5fa5dc1f-0eea-472f-aa8c-ce1e98d56b7a`, baseline `a35dbea0-3ae2-4557-98e2-e7fa59fc1f9b`, verdict VIOLATED.
- REPLAY: evidence `8d2332cf-3877-4ef0-9167-1de0b08b9b4f`, trial `dbaffdfe-6664-49c1-a67c-0017220c1a45`, baseline `ad0b9dba-6501-40c5-b001-90d8cef1ea51`, verdict VIOLATED.

## Minimized reproduction

1. `create` — `POST /api/orders`
2. `cancelled` — `POST /api/orders/{orderId}/cancel`
3. `later` — `POST /api/orders/{orderId}/fulfill`

## Minimized attempt history

- Remove `create`: rejected; PRODUCER REQUIRED; candidate `9ce92909-fac4-4775-8348-f27cced8750b`.
- Remove `cancelled`: rejected; PREDICATE STEP REQUIRED; candidate `ee1573eb-c34f-472d-93ad-f4a36937bc29`.
- Remove `later`: rejected; PREDICATE STEP REQUIRED; candidate `465979ef-f9ef-4950-b0b7-83e32c28f445`.

## Setup and verification

Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.
Generation does not establish supervised verification. This manifest has not been verified through the originating run.

## Exact assertions and sanitized evidence

```json
{
  "approval": {
    "asOf": "2026-10-01T22:18:47.636Z",
    "eligible": true,
    "source": "DEVELOPER",
    "sourceRef": "an order observed as CANCELLED must not later be observed as FULFILLED within the same fresh trial"
  },
  "bestJourney": {
    "dependencies": [
      {
        "consumer": "cancelled",
        "producer": "create",
        "variable": "orderId"
      },
      {
        "consumer": "later",
        "producer": "create",
        "variable": "orderId"
      }
    ],
    "id": "a23b6631-3103-4f64-b9eb-3428e6ec5e3d",
    "predicateRef": {
      "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
      "id": "5b1e45d8-3218-4f3c-a258-e31b68e16b88",
      "version": 1
    },
    "rationale": "Verifies that an order observed as CANCELLED cannot later be successfully fulfilled.",
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
              "stepId": "create"
            }
          }
        ],
        "id": "create",
        "operationId": "POST /api/orders",
        "parameters": []
      },
      {
        "bodyBindings": [],
        "expectedStatuses": [
          200
        ],
        "extracts": [
          {
            "expectedType": "string",
            "name": "cancelState",
            "sensitive": false,
            "source": {
              "kind": "json",
              "pointer": "/state",
              "stepId": "cancelled"
            }
          }
        ],
        "id": "cancelled",
        "operationId": "POST /api/orders/{orderId}/cancel",
        "parameters": [
          {
            "location": "path",
            "name": "orderId",
            "value": {
              "kind": "variable",
              "name": "orderId"
            }
          }
        ]
      },
      {
        "bodyBindings": [],
        "expectedStatuses": [
          409
        ],
        "extracts": [
          {
            "expectedType": "string",
            "name": "fulfillState",
            "sensitive": false,
            "source": {
              "kind": "json",
              "pointer": "/state",
              "stepId": "later"
            }
          }
        ],
        "id": "later",
        "operationId": "POST /api/orders/{orderId}/fulfill",
        "parameters": [
          {
            "location": "path",
            "name": "orderId",
            "value": {
              "kind": "variable",
              "name": "orderId"
            }
          }
        ]
      }
    ],
    "variables": []
  },
  "bestLength": 3,
  "executionProvenance": {
    "acceptedAt": "2026-10-01T22:18:47.636Z",
    "deadlineAt": "2026-10-01T22:28:47.636Z",
    "runId": "cb60a724-be1a-43e8-9f38-79d5c6f7dd52",
    "trialIds": [
      "5fa5dc1f-0eea-472f-aa8c-ce1e98d56b7a",
      "dbaffdfe-6664-49c1-a67c-0017220c1a45"
    ]
  },
  "finding": {
    "classification": "CONFIRMED",
    "consistent": true,
    "id": "f22a27e5-1f60-4a26-bbaf-9bed6b3fe791",
    "initialEvidenceId": "9410c1d6-3df9-48c0-9fb8-f33c8b634200",
    "minimizationStop": "LOCAL MINIMUM",
    "minimizedJourneyId": "a23b6631-3103-4f64-b9eb-3428e6ec5e3d",
    "originalJourneyId": "a23b6631-3103-4f64-b9eb-3428e6ec5e3d",
    "predicateRef": {
      "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
      "id": "5b1e45d8-3218-4f3c-a258-e31b68e16b88",
      "version": 1
    },
    "projectId": "44f4db0f-0dfc-4642-a3e0-4ea9b10984f5",
    "replayEvidenceIds": [
      "8d2332cf-3877-4ef0-9167-1de0b08b9b4f"
    ],
    "transitions": [
      {
        "evidenceRefs": [
          "9410c1d6-3df9-48c0-9fb8-f33c8b634200"
        ],
        "next": "OBSERVED VIOLATION",
        "prior": null,
        "reason": "INITIAL PREDICATE VIOLATION"
      },
      {
        "evidenceRefs": [
          "9410c1d6-3df9-48c0-9fb8-f33c8b634200",
          "8d2332cf-3877-4ef0-9167-1de0b08b9b4f"
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
        "0523b1e6-fe9a-4f38-9ad5-c588edfa5be6"
      ],
      "checkStepIds": [
        "baseline"
      ],
      "id": "a35dbea0-3ae2-4557-98e2-e7fa59fc1f9b",
      "resetStepIds": [
        "reset"
      ],
      "runId": "cb60a724-be1a-43e8-9f38-79d5c6f7dd52",
      "trialId": "5fa5dc1f-0eea-472f-aa8c-ce1e98d56b7a",
      "verdict": "SATISFIED"
    },
    "evidence": {
      "baselineEvidenceId": "a35dbea0-3ae2-4557-98e2-e7fa59fc1f9b",
      "id": "9410c1d6-3df9-48c0-9fb8-f33c8b634200",
      "observationIds": [
        "2da60549-1f7c-41da-96c3-73f94a6e3afd",
        "fdbd1e21-b31f-47eb-a437-99dabe85bb41",
        "93d80da3-94d9-4def-98b6-7e5eef77d927"
      ],
      "outcome": "VIOLATED",
      "phase": "EXPLORATION",
      "predicateRef": {
        "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
        "id": "5b1e45d8-3218-4f3c-a258-e31b68e16b88",
        "version": 1
      },
      "runId": "cb60a724-be1a-43e8-9f38-79d5c6f7dd52",
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
            "stepId": "create"
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
      "trialId": "5fa5dc1f-0eea-472f-aa8c-ce1e98d56b7a"
    },
    "observations": [
      {
        "id": "fdbd1e21-b31f-47eb-a437-99dabe85bb41",
        "result": {
          "elapsedMs": 1.197583000001032,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/orders",
            "url": "http://127.0.0.1:54111/api/orders"
          },
          "sanitizedResponse": {
            "body": {
              "id": "d719b416-6199-4cc6-b4c0-826beaff222c",
              "state": "CREATED"
            },
            "elapsedMs": 1.197583000001032,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 22:18:52 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 201,
            "text": "{\"id\":\"d719b416-6199-4cc6-b4c0-826beaff222c\",\"state\":\"CREATED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T22:18:52.486Z",
          "status": 201,
          "stepId": "create",
          "truncated": false
        },
        "runId": "cb60a724-be1a-43e8-9f38-79d5c6f7dd52",
        "stateMappings": [],
        "stepId": "create",
        "trialId": "5fa5dc1f-0eea-472f-aa8c-ce1e98d56b7a"
      },
      {
        "id": "2da60549-1f7c-41da-96c3-73f94a6e3afd",
        "result": {
          "elapsedMs": 1.2050000000017462,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/orders/{orderId}/cancel",
            "url": "http://127.0.0.1:54111/api/orders/d719b416-6199-4cc6-b4c0-826beaff222c/cancel"
          },
          "sanitizedResponse": {
            "body": {
              "id": "d719b416-6199-4cc6-b4c0-826beaff222c",
              "state": "CANCELLED"
            },
            "elapsedMs": 1.2050000000017462,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 22:18:52 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"d719b416-6199-4cc6-b4c0-826beaff222c\",\"state\":\"CANCELLED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T22:18:52.491Z",
          "status": 200,
          "stepId": "cancelled",
          "truncated": false
        },
        "runId": "cb60a724-be1a-43e8-9f38-79d5c6f7dd52",
        "stateMappings": [],
        "stepId": "cancelled",
        "trialId": "5fa5dc1f-0eea-472f-aa8c-ce1e98d56b7a"
      },
      {
        "id": "93d80da3-94d9-4def-98b6-7e5eef77d927",
        "result": {
          "elapsedMs": 1.6239170000008016,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/orders/{orderId}/fulfill",
            "url": "http://127.0.0.1:54111/api/orders/d719b416-6199-4cc6-b4c0-826beaff222c/fulfill"
          },
          "sanitizedResponse": {
            "body": {
              "id": "d719b416-6199-4cc6-b4c0-826beaff222c",
              "state": "FULFILLED"
            },
            "elapsedMs": 1.6239170000008016,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 22:18:52 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"d719b416-6199-4cc6-b4c0-826beaff222c\",\"state\":\"FULFILLED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T22:18:52.494Z",
          "status": 200,
          "stepId": "later",
          "truncated": false
        },
        "runId": "cb60a724-be1a-43e8-9f38-79d5c6f7dd52",
        "stateMappings": [],
        "stepId": "later",
        "trialId": "5fa5dc1f-0eea-472f-aa8c-ce1e98d56b7a"
      }
    ]
  },
  "minimization": {
    "attempts": [
      {
        "accepted": false,
        "candidate": {
          "dependencies": [],
          "id": "9ce92909-fac4-4775-8348-f27cced8750b",
          "predicateRef": {
            "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
            "id": "5b1e45d8-3218-4f3c-a258-e31b68e16b88",
            "version": 1
          },
          "rationale": "Verifies that an order observed as CANCELLED cannot later be successfully fulfilled.",
          "steps": [
            {
              "bodyBindings": [],
              "expectedStatuses": [
                200
              ],
              "extracts": [
                {
                  "expectedType": "string",
                  "name": "cancelState",
                  "sensitive": false,
                  "source": {
                    "kind": "json",
                    "pointer": "/state",
                    "stepId": "cancelled"
                  }
                }
              ],
              "id": "cancelled",
              "operationId": "POST /api/orders/{orderId}/cancel",
              "parameters": [
                {
                  "location": "path",
                  "name": "orderId",
                  "value": {
                    "kind": "variable",
                    "name": "orderId"
                  }
                }
              ]
            },
            {
              "bodyBindings": [],
              "expectedStatuses": [
                409
              ],
              "extracts": [
                {
                  "expectedType": "string",
                  "name": "fulfillState",
                  "sensitive": false,
                  "source": {
                    "kind": "json",
                    "pointer": "/state",
                    "stepId": "later"
                  }
                }
              ],
              "id": "later",
              "operationId": "POST /api/orders/{orderId}/fulfill",
              "parameters": [
                {
                  "location": "path",
                  "name": "orderId",
                  "value": {
                    "kind": "variable",
                    "name": "orderId"
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
              "variable": "orderId"
            }
          ],
          "id": "ee1573eb-c34f-472d-93ad-f4a36937bc29",
          "predicateRef": {
            "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
            "id": "5b1e45d8-3218-4f3c-a258-e31b68e16b88",
            "version": 1
          },
          "rationale": "Verifies that an order observed as CANCELLED cannot later be successfully fulfilled.",
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
                    "stepId": "create"
                  }
                }
              ],
              "id": "create",
              "operationId": "POST /api/orders",
              "parameters": []
            },
            {
              "bodyBindings": [],
              "expectedStatuses": [
                409
              ],
              "extracts": [
                {
                  "expectedType": "string",
                  "name": "fulfillState",
                  "sensitive": false,
                  "source": {
                    "kind": "json",
                    "pointer": "/state",
                    "stepId": "later"
                  }
                }
              ],
              "id": "later",
              "operationId": "POST /api/orders/{orderId}/fulfill",
              "parameters": [
                {
                  "location": "path",
                  "name": "orderId",
                  "value": {
                    "kind": "variable",
                    "name": "orderId"
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
              "producer": "create",
              "variable": "orderId"
            }
          ],
          "id": "465979ef-f9ef-4950-b0b7-83e32c28f445",
          "predicateRef": {
            "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
            "id": "5b1e45d8-3218-4f3c-a258-e31b68e16b88",
            "version": 1
          },
          "rationale": "Verifies that an order observed as CANCELLED cannot later be successfully fulfilled.",
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
                    "stepId": "create"
                  }
                }
              ],
              "id": "create",
              "operationId": "POST /api/orders",
              "parameters": []
            },
            {
              "bodyBindings": [],
              "expectedStatuses": [
                200
              ],
              "extracts": [
                {
                  "expectedType": "string",
                  "name": "cancelState",
                  "sensitive": false,
                  "source": {
                    "kind": "json",
                    "pointer": "/state",
                    "stepId": "cancelled"
                  }
                }
              ],
              "id": "cancelled",
              "operationId": "POST /api/orders/{orderId}/cancel",
              "parameters": [
                {
                  "location": "path",
                  "name": "orderId",
                  "value": {
                    "kind": "variable",
                    "name": "orderId"
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
          "producer": "create",
          "variable": "orderId"
        },
        {
          "consumer": "later",
          "producer": "create",
          "variable": "orderId"
        }
      ],
      "id": "a23b6631-3103-4f64-b9eb-3428e6ec5e3d",
      "predicateRef": {
        "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
        "id": "5b1e45d8-3218-4f3c-a258-e31b68e16b88",
        "version": 1
      },
      "rationale": "Verifies that an order observed as CANCELLED cannot later be successfully fulfilled.",
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
                "stepId": "create"
              }
            }
          ],
          "id": "create",
          "operationId": "POST /api/orders",
          "parameters": []
        },
        {
          "bodyBindings": [],
          "expectedStatuses": [
            200
          ],
          "extracts": [
            {
              "expectedType": "string",
              "name": "cancelState",
              "sensitive": false,
              "source": {
                "kind": "json",
                "pointer": "/state",
                "stepId": "cancelled"
              }
            }
          ],
          "id": "cancelled",
          "operationId": "POST /api/orders/{orderId}/cancel",
          "parameters": [
            {
              "location": "path",
              "name": "orderId",
              "value": {
                "kind": "variable",
                "name": "orderId"
              }
            }
          ]
        },
        {
          "bodyBindings": [],
          "expectedStatuses": [
            409
          ],
          "extracts": [
            {
              "expectedType": "string",
              "name": "fulfillState",
              "sensitive": false,
              "source": {
                "kind": "json",
                "pointer": "/state",
                "stepId": "later"
              }
            }
          ],
          "id": "later",
          "operationId": "POST /api/orders/{orderId}/fulfill",
          "parameters": [
            {
              "location": "path",
              "name": "orderId",
              "value": {
                "kind": "variable",
                "name": "orderId"
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
      "id": "f22a27e5-1f60-4a26-bbaf-9bed6b3fe791",
      "initialEvidenceId": "9410c1d6-3df9-48c0-9fb8-f33c8b634200",
      "minimizationStop": "LOCAL MINIMUM",
      "minimizedJourneyId": "a23b6631-3103-4f64-b9eb-3428e6ec5e3d",
      "originalJourneyId": "a23b6631-3103-4f64-b9eb-3428e6ec5e3d",
      "predicateRef": {
        "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
        "id": "5b1e45d8-3218-4f3c-a258-e31b68e16b88",
        "version": 1
      },
      "projectId": "44f4db0f-0dfc-4642-a3e0-4ea9b10984f5",
      "replayEvidenceIds": [
        "8d2332cf-3877-4ef0-9167-1de0b08b9b4f"
      ],
      "transitions": [
        {
          "evidenceRefs": [
            "9410c1d6-3df9-48c0-9fb8-f33c8b634200"
          ],
          "next": "OBSERVED VIOLATION",
          "prior": null,
          "reason": "INITIAL PREDICATE VIOLATION"
        },
        {
          "evidenceRefs": [
            "9410c1d6-3df9-48c0-9fb8-f33c8b634200",
            "8d2332cf-3877-4ef0-9167-1de0b08b9b4f"
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
        "producer": "create",
        "variable": "orderId"
      },
      {
        "consumer": "later",
        "producer": "create",
        "variable": "orderId"
      }
    ],
    "id": "a23b6631-3103-4f64-b9eb-3428e6ec5e3d",
    "predicateRef": {
      "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
      "id": "5b1e45d8-3218-4f3c-a258-e31b68e16b88",
      "version": 1
    },
    "rationale": "Verifies that an order observed as CANCELLED cannot later be successfully fulfilled.",
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
              "stepId": "create"
            }
          }
        ],
        "id": "create",
        "operationId": "POST /api/orders",
        "parameters": []
      },
      {
        "bodyBindings": [],
        "expectedStatuses": [
          200
        ],
        "extracts": [
          {
            "expectedType": "string",
            "name": "cancelState",
            "sensitive": false,
            "source": {
              "kind": "json",
              "pointer": "/state",
              "stepId": "cancelled"
            }
          }
        ],
        "id": "cancelled",
        "operationId": "POST /api/orders/{orderId}/cancel",
        "parameters": [
          {
            "location": "path",
            "name": "orderId",
            "value": {
              "kind": "variable",
              "name": "orderId"
            }
          }
        ]
      },
      {
        "bodyBindings": [],
        "expectedStatuses": [
          409
        ],
        "extracts": [
          {
            "expectedType": "string",
            "name": "fulfillState",
            "sensitive": false,
            "source": {
              "kind": "json",
              "pointer": "/state",
              "stepId": "later"
            }
          }
        ],
        "id": "later",
        "operationId": "POST /api/orders/{orderId}/fulfill",
        "parameters": [
          {
            "location": "path",
            "name": "orderId",
            "value": {
              "kind": "variable",
              "name": "orderId"
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
    "id": "5b1e45d8-3218-4f3c-a258-e31b68e16b88",
    "source": "DEVELOPER",
    "sourceRef": "an order observed as CANCELLED must not later be observed as FULFILLED within the same fresh trial",
    "version": 1
  },
  "predicateRef": {
    "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
    "id": "5b1e45d8-3218-4f3c-a258-e31b68e16b88",
    "version": 1
  },
  "replays": [
    {
      "baseline": {
        "assertionIds": [
          "0523b1e6-fe9a-4f38-9ad5-c588edfa5be6"
        ],
        "checkStepIds": [
          "baseline"
        ],
        "id": "ad0b9dba-6501-40c5-b001-90d8cef1ea51",
        "resetStepIds": [
          "reset"
        ],
        "runId": "cb60a724-be1a-43e8-9f38-79d5c6f7dd52",
        "trialId": "dbaffdfe-6664-49c1-a67c-0017220c1a45",
        "verdict": "SATISFIED"
      },
      "evidence": {
        "baselineEvidenceId": "ad0b9dba-6501-40c5-b001-90d8cef1ea51",
        "id": "8d2332cf-3877-4ef0-9167-1de0b08b9b4f",
        "observationIds": [
          "86b30d36-3302-49f6-b86a-882b6fb0ec84",
          "0e314399-b13b-42d4-a088-78e14b33d282",
          "41f24dc4-89bc-4a5d-a05c-c180b1c31f24"
        ],
        "outcome": "VIOLATED",
        "phase": "REPLAY",
        "predicateRef": {
          "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
          "id": "5b1e45d8-3218-4f3c-a258-e31b68e16b88",
          "version": 1
        },
        "runId": "cb60a724-be1a-43e8-9f38-79d5c6f7dd52",
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
              "stepId": "create"
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
        "trialId": "dbaffdfe-6664-49c1-a67c-0017220c1a45"
      },
      "observations": [
        {
          "id": "86b30d36-3302-49f6-b86a-882b6fb0ec84",
          "result": {
            "elapsedMs": 1.1984579999989364,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/orders",
              "url": "http://127.0.0.1:54111/api/orders"
            },
            "sanitizedResponse": {
              "body": {
                "id": "5f6028ae-6850-4257-9c14-7999634b19a6",
                "state": "CREATED"
              },
              "elapsedMs": 1.1984579999989364,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 22:18:52 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 201,
              "text": "{\"id\":\"5f6028ae-6850-4257-9c14-7999634b19a6\",\"state\":\"CREATED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T22:18:52.526Z",
            "status": 201,
            "stepId": "create",
            "truncated": false
          },
          "runId": "cb60a724-be1a-43e8-9f38-79d5c6f7dd52",
          "stateMappings": [],
          "stepId": "create",
          "trialId": "dbaffdfe-6664-49c1-a67c-0017220c1a45"
        },
        {
          "id": "41f24dc4-89bc-4a5d-a05c-c180b1c31f24",
          "result": {
            "elapsedMs": 1.1322499999987485,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/orders/{orderId}/cancel",
              "url": "http://127.0.0.1:54111/api/orders/5f6028ae-6850-4257-9c14-7999634b19a6/cancel"
            },
            "sanitizedResponse": {
              "body": {
                "id": "5f6028ae-6850-4257-9c14-7999634b19a6",
                "state": "CANCELLED"
              },
              "elapsedMs": 1.1322499999987485,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 22:18:52 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"5f6028ae-6850-4257-9c14-7999634b19a6\",\"state\":\"CANCELLED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T22:18:52.529Z",
            "status": 200,
            "stepId": "cancelled",
            "truncated": false
          },
          "runId": "cb60a724-be1a-43e8-9f38-79d5c6f7dd52",
          "stateMappings": [],
          "stepId": "cancelled",
          "trialId": "dbaffdfe-6664-49c1-a67c-0017220c1a45"
        },
        {
          "id": "0e314399-b13b-42d4-a088-78e14b33d282",
          "result": {
            "elapsedMs": 1.004292000001442,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/orders/{orderId}/fulfill",
              "url": "http://127.0.0.1:54111/api/orders/5f6028ae-6850-4257-9c14-7999634b19a6/fulfill"
            },
            "sanitizedResponse": {
              "body": {
                "id": "5f6028ae-6850-4257-9c14-7999634b19a6",
                "state": "FULFILLED"
              },
              "elapsedMs": 1.004292000001442,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 22:18:52 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"5f6028ae-6850-4257-9c14-7999634b19a6\",\"state\":\"FULFILLED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T22:18:52.533Z",
            "status": 200,
            "stepId": "later",
            "truncated": false
          },
          "runId": "cb60a724-be1a-43e8-9f38-79d5c6f7dd52",
          "stateMappings": [],
          "stepId": "later",
          "trialId": "dbaffdfe-6664-49c1-a67c-0017220c1a45"
        }
      ]
    }
  ],
  "reproductionClaim": "shortest verified sequence found",
  "runId": "cb60a724-be1a-43e8-9f38-79d5c6f7dd52",
  "setup": "Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.",
  "stopReason": "LOCAL MINIMUM",
  "truncated": false,
  "verification": "UNVERIFIED"
}
```
