# GhostQA finding evidence

Finding: `83d4184a-0638-4622-a064-2a2c73812d5a` — CONFIRMED
Evidence chain: OBSERVED VIOLATION → CONFIRMED → best verified reproducer.
Consistency: true. Artifact: GENERATED / UNVERIFIED.

Predicate: `79801138-6d77-4110-a899-fcf9c4de11e0`, version 1, canonical hash `ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d`.
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

- EXPLORATION: evidence `9cb30ceb-e7d2-4437-9b4d-bfe567fa6405`, trial `8b39f66e-31d8-4973-9bb4-b4e39ea503f9`, baseline `0b8b58ca-d977-4ddd-af46-2cce5c0e549a`, verdict VIOLATED.
- REPLAY: evidence `c1ea2384-5b3e-4dc1-918a-271ac8dad54a`, trial `f451c203-4b9f-4464-85ba-73799428abe6`, baseline `35fef712-282f-4fa6-8fed-7e19522bd223`, verdict VIOLATED.

## Minimized reproduction

1. `create` — `POST /api/orders`
2. `cancelled` — `POST /api/orders/{orderId}/cancel`
3. `later` — `POST /api/orders/{orderId}/fulfill`

## Minimized attempt history

- Remove `create`: rejected; PRODUCER REQUIRED; candidate `3f041c8d-5c06-4c42-aaa6-a69a451ddf75`.
- Remove `cancelled`: rejected; PREDICATE STEP REQUIRED; candidate `7bd93956-362d-4e00-a0ae-224c47eada0a`.
- Remove `later`: rejected; PREDICATE STEP REQUIRED; candidate `93486527-d23f-4200-9759-adb48f3d8c51`.

## Setup and verification

Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.
Generation does not establish supervised verification. This manifest has not been verified through the originating run.

## Exact assertions and sanitized evidence

```json
{
  "approval": {
    "asOf": "2026-10-01T20:40:48.801Z",
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
    "id": "8664dfe1-c9d7-4288-98e5-4decbdd7c321",
    "predicateRef": {
      "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
      "id": "79801138-6d77-4110-a899-fcf9c4de11e0",
      "version": 1
    },
    "rationale": "Journey creates an order, cancels it, and subsequently attempts fulfillment to validate the approved predicate definition covering state transition constraints.",
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
          200,
          409
        ],
        "extracts": [],
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
          200,
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
    "acceptedAt": "2026-10-01T20:40:48.801Z",
    "deadlineAt": "2026-10-01T20:50:48.801Z",
    "runId": "ea34c5e3-1b28-4741-86a9-3521d33e8d2d",
    "trialIds": [
      "8b39f66e-31d8-4973-9bb4-b4e39ea503f9",
      "f451c203-4b9f-4464-85ba-73799428abe6"
    ]
  },
  "finding": {
    "classification": "CONFIRMED",
    "consistent": true,
    "id": "83d4184a-0638-4622-a064-2a2c73812d5a",
    "initialEvidenceId": "9cb30ceb-e7d2-4437-9b4d-bfe567fa6405",
    "minimizationStop": "LOCAL MINIMUM",
    "minimizedJourneyId": "8664dfe1-c9d7-4288-98e5-4decbdd7c321",
    "originalJourneyId": "8664dfe1-c9d7-4288-98e5-4decbdd7c321",
    "predicateRef": {
      "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
      "id": "79801138-6d77-4110-a899-fcf9c4de11e0",
      "version": 1
    },
    "projectId": "4e47acdf-433e-4cb6-abcd-02e3b9529350",
    "replayEvidenceIds": [
      "c1ea2384-5b3e-4dc1-918a-271ac8dad54a"
    ],
    "transitions": [
      {
        "evidenceRefs": [
          "9cb30ceb-e7d2-4437-9b4d-bfe567fa6405"
        ],
        "next": "OBSERVED VIOLATION",
        "prior": null,
        "reason": "INITIAL PREDICATE VIOLATION"
      },
      {
        "evidenceRefs": [
          "9cb30ceb-e7d2-4437-9b4d-bfe567fa6405",
          "c1ea2384-5b3e-4dc1-918a-271ac8dad54a"
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
        "77fa58dc-1483-4311-85d7-9bbd6f11b344"
      ],
      "checkStepIds": [
        "baseline"
      ],
      "id": "0b8b58ca-d977-4ddd-af46-2cce5c0e549a",
      "resetStepIds": [
        "reset"
      ],
      "runId": "ea34c5e3-1b28-4741-86a9-3521d33e8d2d",
      "trialId": "8b39f66e-31d8-4973-9bb4-b4e39ea503f9",
      "verdict": "SATISFIED"
    },
    "evidence": {
      "baselineEvidenceId": "0b8b58ca-d977-4ddd-af46-2cce5c0e549a",
      "id": "9cb30ceb-e7d2-4437-9b4d-bfe567fa6405",
      "observationIds": [
        "8f5a161a-32b2-4975-84de-ec1d100a2b04",
        "5335c324-c527-47e9-ab58-1aef95d7afe0",
        "9ccfb7af-e25f-4152-bade-b17e959d4d77"
      ],
      "outcome": "VIOLATED",
      "phase": "EXPLORATION",
      "predicateRef": {
        "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
        "id": "79801138-6d77-4110-a899-fcf9c4de11e0",
        "version": 1
      },
      "runId": "ea34c5e3-1b28-4741-86a9-3521d33e8d2d",
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
      "trialId": "8b39f66e-31d8-4973-9bb4-b4e39ea503f9"
    },
    "observations": [
      {
        "id": "8f5a161a-32b2-4975-84de-ec1d100a2b04",
        "result": {
          "elapsedMs": 0.5635419999998703,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/orders",
            "url": "http://127.0.0.1:65168/api/orders"
          },
          "sanitizedResponse": {
            "body": {
              "id": "86f2651d-c64e-431f-8f6d-cac5492cffe0",
              "state": "CREATED"
            },
            "elapsedMs": 0.5635419999998703,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 20:40:52 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 201,
            "text": "{\"id\":\"86f2651d-c64e-431f-8f6d-cac5492cffe0\",\"state\":\"CREATED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T20:40:52.442Z",
          "status": 201,
          "stepId": "create",
          "truncated": false
        },
        "runId": "ea34c5e3-1b28-4741-86a9-3521d33e8d2d",
        "stateMappings": [],
        "stepId": "create",
        "trialId": "8b39f66e-31d8-4973-9bb4-b4e39ea503f9"
      },
      {
        "id": "5335c324-c527-47e9-ab58-1aef95d7afe0",
        "result": {
          "elapsedMs": 0.5475420000002487,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/orders/{orderId}/cancel",
            "url": "http://127.0.0.1:65168/api/orders/86f2651d-c64e-431f-8f6d-cac5492cffe0/cancel"
          },
          "sanitizedResponse": {
            "body": {
              "id": "86f2651d-c64e-431f-8f6d-cac5492cffe0",
              "state": "CANCELLED"
            },
            "elapsedMs": 0.5475420000002487,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 20:40:52 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"86f2651d-c64e-431f-8f6d-cac5492cffe0\",\"state\":\"CANCELLED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T20:40:52.445Z",
          "status": 200,
          "stepId": "cancelled",
          "truncated": false
        },
        "runId": "ea34c5e3-1b28-4741-86a9-3521d33e8d2d",
        "stateMappings": [],
        "stepId": "cancelled",
        "trialId": "8b39f66e-31d8-4973-9bb4-b4e39ea503f9"
      },
      {
        "id": "9ccfb7af-e25f-4152-bade-b17e959d4d77",
        "result": {
          "elapsedMs": 0.45516700000007404,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/orders/{orderId}/fulfill",
            "url": "http://127.0.0.1:65168/api/orders/86f2651d-c64e-431f-8f6d-cac5492cffe0/fulfill"
          },
          "sanitizedResponse": {
            "body": {
              "id": "86f2651d-c64e-431f-8f6d-cac5492cffe0",
              "state": "FULFILLED"
            },
            "elapsedMs": 0.45516700000007404,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 20:40:52 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"86f2651d-c64e-431f-8f6d-cac5492cffe0\",\"state\":\"FULFILLED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T20:40:52.448Z",
          "status": 200,
          "stepId": "later",
          "truncated": false
        },
        "runId": "ea34c5e3-1b28-4741-86a9-3521d33e8d2d",
        "stateMappings": [],
        "stepId": "later",
        "trialId": "8b39f66e-31d8-4973-9bb4-b4e39ea503f9"
      }
    ]
  },
  "minimization": {
    "attempts": [
      {
        "accepted": false,
        "candidate": {
          "dependencies": [],
          "id": "3f041c8d-5c06-4c42-aaa6-a69a451ddf75",
          "predicateRef": {
            "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
            "id": "79801138-6d77-4110-a899-fcf9c4de11e0",
            "version": 1
          },
          "rationale": "Journey creates an order, cancels it, and subsequently attempts fulfillment to validate the approved predicate definition covering state transition constraints.",
          "steps": [
            {
              "bodyBindings": [],
              "expectedStatuses": [
                200,
                409
              ],
              "extracts": [],
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
                200,
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
          "id": "7bd93956-362d-4e00-a0ae-224c47eada0a",
          "predicateRef": {
            "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
            "id": "79801138-6d77-4110-a899-fcf9c4de11e0",
            "version": 1
          },
          "rationale": "Journey creates an order, cancels it, and subsequently attempts fulfillment to validate the approved predicate definition covering state transition constraints.",
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
                200,
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
          "id": "93486527-d23f-4200-9759-adb48f3d8c51",
          "predicateRef": {
            "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
            "id": "79801138-6d77-4110-a899-fcf9c4de11e0",
            "version": 1
          },
          "rationale": "Journey creates an order, cancels it, and subsequently attempts fulfillment to validate the approved predicate definition covering state transition constraints.",
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
                200,
                409
              ],
              "extracts": [],
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
      "id": "8664dfe1-c9d7-4288-98e5-4decbdd7c321",
      "predicateRef": {
        "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
        "id": "79801138-6d77-4110-a899-fcf9c4de11e0",
        "version": 1
      },
      "rationale": "Journey creates an order, cancels it, and subsequently attempts fulfillment to validate the approved predicate definition covering state transition constraints.",
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
            200,
            409
          ],
          "extracts": [],
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
            200,
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
      "id": "83d4184a-0638-4622-a064-2a2c73812d5a",
      "initialEvidenceId": "9cb30ceb-e7d2-4437-9b4d-bfe567fa6405",
      "minimizationStop": "LOCAL MINIMUM",
      "minimizedJourneyId": "8664dfe1-c9d7-4288-98e5-4decbdd7c321",
      "originalJourneyId": "8664dfe1-c9d7-4288-98e5-4decbdd7c321",
      "predicateRef": {
        "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
        "id": "79801138-6d77-4110-a899-fcf9c4de11e0",
        "version": 1
      },
      "projectId": "4e47acdf-433e-4cb6-abcd-02e3b9529350",
      "replayEvidenceIds": [
        "c1ea2384-5b3e-4dc1-918a-271ac8dad54a"
      ],
      "transitions": [
        {
          "evidenceRefs": [
            "9cb30ceb-e7d2-4437-9b4d-bfe567fa6405"
          ],
          "next": "OBSERVED VIOLATION",
          "prior": null,
          "reason": "INITIAL PREDICATE VIOLATION"
        },
        {
          "evidenceRefs": [
            "9cb30ceb-e7d2-4437-9b4d-bfe567fa6405",
            "c1ea2384-5b3e-4dc1-918a-271ac8dad54a"
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
    "id": "8664dfe1-c9d7-4288-98e5-4decbdd7c321",
    "predicateRef": {
      "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
      "id": "79801138-6d77-4110-a899-fcf9c4de11e0",
      "version": 1
    },
    "rationale": "Journey creates an order, cancels it, and subsequently attempts fulfillment to validate the approved predicate definition covering state transition constraints.",
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
          200,
          409
        ],
        "extracts": [],
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
          200,
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
    "id": "79801138-6d77-4110-a899-fcf9c4de11e0",
    "source": "DEVELOPER",
    "sourceRef": "an order observed as CANCELLED must not later be observed as FULFILLED within the same fresh trial",
    "version": 1
  },
  "predicateRef": {
    "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
    "id": "79801138-6d77-4110-a899-fcf9c4de11e0",
    "version": 1
  },
  "replays": [
    {
      "baseline": {
        "assertionIds": [
          "77fa58dc-1483-4311-85d7-9bbd6f11b344"
        ],
        "checkStepIds": [
          "baseline"
        ],
        "id": "35fef712-282f-4fa6-8fed-7e19522bd223",
        "resetStepIds": [
          "reset"
        ],
        "runId": "ea34c5e3-1b28-4741-86a9-3521d33e8d2d",
        "trialId": "f451c203-4b9f-4464-85ba-73799428abe6",
        "verdict": "SATISFIED"
      },
      "evidence": {
        "baselineEvidenceId": "35fef712-282f-4fa6-8fed-7e19522bd223",
        "id": "c1ea2384-5b3e-4dc1-918a-271ac8dad54a",
        "observationIds": [
          "4be19b82-1367-4735-8d82-7c249a63da37",
          "7849fd20-0142-44e5-81be-59fbdeb9440b",
          "560dba33-e53d-4da3-9e8a-5651e66e404b"
        ],
        "outcome": "VIOLATED",
        "phase": "REPLAY",
        "predicateRef": {
          "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
          "id": "79801138-6d77-4110-a899-fcf9c4de11e0",
          "version": 1
        },
        "runId": "ea34c5e3-1b28-4741-86a9-3521d33e8d2d",
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
        "trialId": "f451c203-4b9f-4464-85ba-73799428abe6"
      },
      "observations": [
        {
          "id": "4be19b82-1367-4735-8d82-7c249a63da37",
          "result": {
            "elapsedMs": 0.3902079999988928,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/orders",
              "url": "http://127.0.0.1:65168/api/orders"
            },
            "sanitizedResponse": {
              "body": {
                "id": "85d155d8-310f-47c9-8062-6c764efcbbbf",
                "state": "CREATED"
              },
              "elapsedMs": 0.3902079999988928,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 20:40:52 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 201,
              "text": "{\"id\":\"85d155d8-310f-47c9-8062-6c764efcbbbf\",\"state\":\"CREATED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T20:40:52.469Z",
            "status": 201,
            "stepId": "create",
            "truncated": false
          },
          "runId": "ea34c5e3-1b28-4741-86a9-3521d33e8d2d",
          "stateMappings": [],
          "stepId": "create",
          "trialId": "f451c203-4b9f-4464-85ba-73799428abe6"
        },
        {
          "id": "560dba33-e53d-4da3-9e8a-5651e66e404b",
          "result": {
            "elapsedMs": 0.37204099999871687,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/orders/{orderId}/cancel",
              "url": "http://127.0.0.1:65168/api/orders/85d155d8-310f-47c9-8062-6c764efcbbbf/cancel"
            },
            "sanitizedResponse": {
              "body": {
                "id": "85d155d8-310f-47c9-8062-6c764efcbbbf",
                "state": "CANCELLED"
              },
              "elapsedMs": 0.37204099999871687,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 20:40:52 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"85d155d8-310f-47c9-8062-6c764efcbbbf\",\"state\":\"CANCELLED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T20:40:52.471Z",
            "status": 200,
            "stepId": "cancelled",
            "truncated": false
          },
          "runId": "ea34c5e3-1b28-4741-86a9-3521d33e8d2d",
          "stateMappings": [],
          "stepId": "cancelled",
          "trialId": "f451c203-4b9f-4464-85ba-73799428abe6"
        },
        {
          "id": "7849fd20-0142-44e5-81be-59fbdeb9440b",
          "result": {
            "elapsedMs": 0.401625000000422,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/orders/{orderId}/fulfill",
              "url": "http://127.0.0.1:65168/api/orders/85d155d8-310f-47c9-8062-6c764efcbbbf/fulfill"
            },
            "sanitizedResponse": {
              "body": {
                "id": "85d155d8-310f-47c9-8062-6c764efcbbbf",
                "state": "FULFILLED"
              },
              "elapsedMs": 0.401625000000422,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 20:40:52 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"85d155d8-310f-47c9-8062-6c764efcbbbf\",\"state\":\"FULFILLED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T20:40:52.472Z",
            "status": 200,
            "stepId": "later",
            "truncated": false
          },
          "runId": "ea34c5e3-1b28-4741-86a9-3521d33e8d2d",
          "stateMappings": [],
          "stepId": "later",
          "trialId": "f451c203-4b9f-4464-85ba-73799428abe6"
        }
      ]
    }
  ],
  "reproductionClaim": "shortest verified sequence found",
  "runId": "ea34c5e3-1b28-4741-86a9-3521d33e8d2d",
  "setup": "Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.",
  "stopReason": "LOCAL MINIMUM",
  "truncated": false,
  "verification": "UNVERIFIED"
}
```
