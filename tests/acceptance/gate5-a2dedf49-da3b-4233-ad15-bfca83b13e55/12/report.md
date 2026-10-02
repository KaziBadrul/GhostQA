# GhostQA finding evidence

Finding: `362acbc5-4bcd-4196-8b9f-fa06682a1faf` — CONFIRMED
Evidence chain: OBSERVED VIOLATION → CONFIRMED → best verified reproducer.
Consistency: true. Artifact: GENERATED / UNVERIFIED.

Predicate: `a4e49b34-0b7e-4d33-90a8-a9b79218da06`, version 1, canonical hash `04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9`.
Approval provenance: DEVELOPER; source `an item observed as UNAVAILABLE must not later be observed as ALLOCATED within the same fresh trial`; eligible as of run acceptance: true.

Original journey length: 3. Best verified journey length: 3.
This is the shortest verified sequence found.
It is locally irreducible under attempted deletion strategy.
Local minimization stop reason: LOCAL MINIMUM.
Truncated: no.

## Expected invariant

When the applicability conditions hold, every approved assertion must be satisfied:

- `{"kind":"json","pointer":"/state","stepId":"later"}` not-equals `{"kind":"literal","value":"ALLOCATED"}`

## Evidence references

- EXPLORATION: evidence `fb574e24-0d30-4e28-b0c2-5f7d36dd8f86`, trial `e91a6c4b-ca21-42e1-867a-5f3653d4c21c`, baseline `841fce3e-4415-4715-aa96-c1c804432dd0`, verdict VIOLATED.
- REPLAY: evidence `fb57583b-5a73-4973-922b-c4f5d38e0a34`, trial `0ac7c082-b926-44c8-b007-19ecc22fc9d8`, baseline `11a0a870-e285-4da9-a8e3-d59035a4ac98`, verdict VIOLATED.

## Minimized reproduction

1. `create` — `POST /api/items`
2. `unavailable` — `POST /api/items/{itemId}/unavailable`
3. `later` — `POST /api/items/{itemId}/allocate`

## Minimized attempt history

- Remove `create`: rejected; PRODUCER REQUIRED; candidate `95241efe-929a-4cd4-a2da-cdc5b7e41686`.
- Remove `unavailable`: rejected; PREDICATE STEP REQUIRED; candidate `7b16f776-0da2-4ef6-8ebc-dc467ded7555`.
- Remove `later`: rejected; PREDICATE STEP REQUIRED; candidate `f1a3556a-3988-4005-9b2a-7c20105e3e7e`.

## Setup and verification

Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.
Generation does not establish supervised verification. This manifest has not been verified through the originating run.

## Exact assertions and sanitized evidence

```json
{
  "approval": {
    "asOf": "2026-10-01T22:06:14.874Z",
    "eligible": true,
    "source": "DEVELOPER",
    "sourceRef": "an item observed as UNAVAILABLE must not later be observed as ALLOCATED within the same fresh trial"
  },
  "bestJourney": {
    "dependencies": [
      {
        "consumer": "unavailable",
        "producer": "create",
        "variable": "itemId"
      },
      {
        "consumer": "later",
        "producer": "create",
        "variable": "itemId"
      }
    ],
    "id": "2b10c577-d25b-4e91-b9da-7294201854e6",
    "predicateRef": {
      "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
      "id": "a4e49b34-0b7e-4d33-90a8-a9b79218da06",
      "version": 1
    },
    "rationale": "Journey validating item state transition restrictions from unavailable to allocated.",
    "steps": [
      {
        "bodyBindings": [],
        "expectedStatuses": [
          201
        ],
        "extracts": [
          {
            "expectedType": "string",
            "name": "itemId",
            "sensitive": false,
            "source": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "create"
            }
          }
        ],
        "id": "create",
        "operationId": "POST /api/items",
        "parameters": []
      },
      {
        "bodyBindings": [],
        "expectedStatuses": [
          200,
          409
        ],
        "extracts": [],
        "id": "unavailable",
        "operationId": "POST /api/items/{itemId}/unavailable",
        "parameters": [
          {
            "location": "path",
            "name": "itemId",
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
        "operationId": "POST /api/items/{itemId}/allocate",
        "parameters": [
          {
            "location": "path",
            "name": "itemId",
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
    "acceptedAt": "2026-10-01T22:06:14.874Z",
    "deadlineAt": "2026-10-01T22:16:14.874Z",
    "runId": "6ceb8ec7-2eed-4e2c-b24f-6adc66a245d4",
    "trialIds": [
      "e91a6c4b-ca21-42e1-867a-5f3653d4c21c",
      "0ac7c082-b926-44c8-b007-19ecc22fc9d8"
    ]
  },
  "finding": {
    "classification": "CONFIRMED",
    "consistent": true,
    "id": "362acbc5-4bcd-4196-8b9f-fa06682a1faf",
    "initialEvidenceId": "fb574e24-0d30-4e28-b0c2-5f7d36dd8f86",
    "minimizationStop": "LOCAL MINIMUM",
    "minimizedJourneyId": "2b10c577-d25b-4e91-b9da-7294201854e6",
    "originalJourneyId": "2b10c577-d25b-4e91-b9da-7294201854e6",
    "predicateRef": {
      "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
      "id": "a4e49b34-0b7e-4d33-90a8-a9b79218da06",
      "version": 1
    },
    "projectId": "25efebc8-bc66-42cb-b121-0a5c498e6957",
    "replayEvidenceIds": [
      "fb57583b-5a73-4973-922b-c4f5d38e0a34"
    ],
    "transitions": [
      {
        "evidenceRefs": [
          "fb574e24-0d30-4e28-b0c2-5f7d36dd8f86"
        ],
        "next": "OBSERVED VIOLATION",
        "prior": null,
        "reason": "INITIAL PREDICATE VIOLATION"
      },
      {
        "evidenceRefs": [
          "fb574e24-0d30-4e28-b0c2-5f7d36dd8f86",
          "fb57583b-5a73-4973-922b-c4f5d38e0a34"
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
        "34085eb9-c2e7-4fc3-8205-0af935ceee16"
      ],
      "checkStepIds": [
        "baseline"
      ],
      "id": "841fce3e-4415-4715-aa96-c1c804432dd0",
      "resetStepIds": [
        "reset"
      ],
      "runId": "6ceb8ec7-2eed-4e2c-b24f-6adc66a245d4",
      "trialId": "e91a6c4b-ca21-42e1-867a-5f3653d4c21c",
      "verdict": "SATISFIED"
    },
    "evidence": {
      "baselineEvidenceId": "841fce3e-4415-4715-aa96-c1c804432dd0",
      "id": "fb574e24-0d30-4e28-b0c2-5f7d36dd8f86",
      "observationIds": [
        "eb50c358-6ead-4ca3-896a-9e3a2894909b",
        "fa5a61fd-d399-4014-ae30-89ad705fd587",
        "a818b1da-ca8f-4d76-870e-f8054f527626"
      ],
      "outcome": "VIOLATED",
      "phase": "EXPLORATION",
      "predicateRef": {
        "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
        "id": "a4e49b34-0b7e-4d33-90a8-a9b79218da06",
        "version": 1
      },
      "runId": "6ceb8ec7-2eed-4e2c-b24f-6adc66a245d4",
      "symbolicOperands": {
        "applicability": [
          {
            "left": {
              "kind": "json",
              "pointer": "/state",
              "stepId": "unavailable"
            },
            "op": "equals",
            "right": {
              "kind": "literal",
              "value": "UNAVAILABLE"
            }
          },
          {
            "left": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "unavailable"
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
              "stepId": "unavailable"
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
              "value": "ALLOCATED"
            }
          }
        ],
        "executionOrder": [
          {
            "operationId": "POST /api/items",
            "ordinal": 0,
            "stepId": "create"
          },
          {
            "operationId": "POST /api/items/{itemId}/unavailable",
            "ordinal": 1,
            "stepId": "unavailable"
          },
          {
            "operationId": "POST /api/items/{itemId}/allocate",
            "ordinal": 2,
            "stepId": "later"
          }
        ]
      },
      "trialId": "e91a6c4b-ca21-42e1-867a-5f3653d4c21c"
    },
    "observations": [
      {
        "id": "eb50c358-6ead-4ca3-896a-9e3a2894909b",
        "result": {
          "elapsedMs": 1.6337920000078157,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/items",
            "url": "http://127.0.0.1:52965/api/items"
          },
          "sanitizedResponse": {
            "body": {
              "id": "d481c9e6-2e51-463d-b1ff-7f23d37ca03b",
              "state": "AVAILABLE"
            },
            "elapsedMs": 1.6337920000078157,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 22:06:19 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 201,
            "text": "{\"id\":\"d481c9e6-2e51-463d-b1ff-7f23d37ca03b\",\"state\":\"AVAILABLE\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T22:06:19.277Z",
          "status": 201,
          "stepId": "create",
          "truncated": false
        },
        "runId": "6ceb8ec7-2eed-4e2c-b24f-6adc66a245d4",
        "stateMappings": [],
        "stepId": "create",
        "trialId": "e91a6c4b-ca21-42e1-867a-5f3653d4c21c"
      },
      {
        "id": "fa5a61fd-d399-4014-ae30-89ad705fd587",
        "result": {
          "elapsedMs": 2.0300830000051064,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/items/{itemId}/unavailable",
            "url": "http://127.0.0.1:52965/api/items/d481c9e6-2e51-463d-b1ff-7f23d37ca03b/unavailable"
          },
          "sanitizedResponse": {
            "body": {
              "id": "d481c9e6-2e51-463d-b1ff-7f23d37ca03b",
              "state": "UNAVAILABLE"
            },
            "elapsedMs": 2.0300830000051064,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 22:06:19 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"d481c9e6-2e51-463d-b1ff-7f23d37ca03b\",\"state\":\"UNAVAILABLE\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T22:06:19.283Z",
          "status": 200,
          "stepId": "unavailable",
          "truncated": false
        },
        "runId": "6ceb8ec7-2eed-4e2c-b24f-6adc66a245d4",
        "stateMappings": [],
        "stepId": "unavailable",
        "trialId": "e91a6c4b-ca21-42e1-867a-5f3653d4c21c"
      },
      {
        "id": "a818b1da-ca8f-4d76-870e-f8054f527626",
        "result": {
          "elapsedMs": 1.7550829999963753,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/items/{itemId}/allocate",
            "url": "http://127.0.0.1:52965/api/items/d481c9e6-2e51-463d-b1ff-7f23d37ca03b/allocate"
          },
          "sanitizedResponse": {
            "body": {
              "id": "d481c9e6-2e51-463d-b1ff-7f23d37ca03b",
              "state": "ALLOCATED"
            },
            "elapsedMs": 1.7550829999963753,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 22:06:19 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"d481c9e6-2e51-463d-b1ff-7f23d37ca03b\",\"state\":\"ALLOCATED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T22:06:19.289Z",
          "status": 200,
          "stepId": "later",
          "truncated": false
        },
        "runId": "6ceb8ec7-2eed-4e2c-b24f-6adc66a245d4",
        "stateMappings": [],
        "stepId": "later",
        "trialId": "e91a6c4b-ca21-42e1-867a-5f3653d4c21c"
      }
    ]
  },
  "minimization": {
    "attempts": [
      {
        "accepted": false,
        "candidate": {
          "dependencies": [],
          "id": "95241efe-929a-4cd4-a2da-cdc5b7e41686",
          "predicateRef": {
            "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
            "id": "a4e49b34-0b7e-4d33-90a8-a9b79218da06",
            "version": 1
          },
          "rationale": "Journey validating item state transition restrictions from unavailable to allocated.",
          "steps": [
            {
              "bodyBindings": [],
              "expectedStatuses": [
                200,
                409
              ],
              "extracts": [],
              "id": "unavailable",
              "operationId": "POST /api/items/{itemId}/unavailable",
              "parameters": [
                {
                  "location": "path",
                  "name": "itemId",
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
              "operationId": "POST /api/items/{itemId}/allocate",
              "parameters": [
                {
                  "location": "path",
                  "name": "itemId",
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
              "variable": "itemId"
            }
          ],
          "id": "7b16f776-0da2-4ef6-8ebc-dc467ded7555",
          "predicateRef": {
            "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
            "id": "a4e49b34-0b7e-4d33-90a8-a9b79218da06",
            "version": 1
          },
          "rationale": "Journey validating item state transition restrictions from unavailable to allocated.",
          "steps": [
            {
              "bodyBindings": [],
              "expectedStatuses": [
                201
              ],
              "extracts": [
                {
                  "expectedType": "string",
                  "name": "itemId",
                  "sensitive": false,
                  "source": {
                    "kind": "json",
                    "pointer": "/id",
                    "stepId": "create"
                  }
                }
              ],
              "id": "create",
              "operationId": "POST /api/items",
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
              "operationId": "POST /api/items/{itemId}/allocate",
              "parameters": [
                {
                  "location": "path",
                  "name": "itemId",
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
        "removedStepId": "unavailable"
      },
      {
        "accepted": false,
        "candidate": {
          "dependencies": [
            {
              "consumer": "unavailable",
              "producer": "create",
              "variable": "itemId"
            }
          ],
          "id": "f1a3556a-3988-4005-9b2a-7c20105e3e7e",
          "predicateRef": {
            "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
            "id": "a4e49b34-0b7e-4d33-90a8-a9b79218da06",
            "version": 1
          },
          "rationale": "Journey validating item state transition restrictions from unavailable to allocated.",
          "steps": [
            {
              "bodyBindings": [],
              "expectedStatuses": [
                201
              ],
              "extracts": [
                {
                  "expectedType": "string",
                  "name": "itemId",
                  "sensitive": false,
                  "source": {
                    "kind": "json",
                    "pointer": "/id",
                    "stepId": "create"
                  }
                }
              ],
              "id": "create",
              "operationId": "POST /api/items",
              "parameters": []
            },
            {
              "bodyBindings": [],
              "expectedStatuses": [
                200,
                409
              ],
              "extracts": [],
              "id": "unavailable",
              "operationId": "POST /api/items/{itemId}/unavailable",
              "parameters": [
                {
                  "location": "path",
                  "name": "itemId",
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
          "consumer": "unavailable",
          "producer": "create",
          "variable": "itemId"
        },
        {
          "consumer": "later",
          "producer": "create",
          "variable": "itemId"
        }
      ],
      "id": "2b10c577-d25b-4e91-b9da-7294201854e6",
      "predicateRef": {
        "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
        "id": "a4e49b34-0b7e-4d33-90a8-a9b79218da06",
        "version": 1
      },
      "rationale": "Journey validating item state transition restrictions from unavailable to allocated.",
      "steps": [
        {
          "bodyBindings": [],
          "expectedStatuses": [
            201
          ],
          "extracts": [
            {
              "expectedType": "string",
              "name": "itemId",
              "sensitive": false,
              "source": {
                "kind": "json",
                "pointer": "/id",
                "stepId": "create"
              }
            }
          ],
          "id": "create",
          "operationId": "POST /api/items",
          "parameters": []
        },
        {
          "bodyBindings": [],
          "expectedStatuses": [
            200,
            409
          ],
          "extracts": [],
          "id": "unavailable",
          "operationId": "POST /api/items/{itemId}/unavailable",
          "parameters": [
            {
              "location": "path",
              "name": "itemId",
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
          "operationId": "POST /api/items/{itemId}/allocate",
          "parameters": [
            {
              "location": "path",
              "name": "itemId",
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
      "id": "362acbc5-4bcd-4196-8b9f-fa06682a1faf",
      "initialEvidenceId": "fb574e24-0d30-4e28-b0c2-5f7d36dd8f86",
      "minimizationStop": "LOCAL MINIMUM",
      "minimizedJourneyId": "2b10c577-d25b-4e91-b9da-7294201854e6",
      "originalJourneyId": "2b10c577-d25b-4e91-b9da-7294201854e6",
      "predicateRef": {
        "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
        "id": "a4e49b34-0b7e-4d33-90a8-a9b79218da06",
        "version": 1
      },
      "projectId": "25efebc8-bc66-42cb-b121-0a5c498e6957",
      "replayEvidenceIds": [
        "fb57583b-5a73-4973-922b-c4f5d38e0a34"
      ],
      "transitions": [
        {
          "evidenceRefs": [
            "fb574e24-0d30-4e28-b0c2-5f7d36dd8f86"
          ],
          "next": "OBSERVED VIOLATION",
          "prior": null,
          "reason": "INITIAL PREDICATE VIOLATION"
        },
        {
          "evidenceRefs": [
            "fb574e24-0d30-4e28-b0c2-5f7d36dd8f86",
            "fb57583b-5a73-4973-922b-c4f5d38e0a34"
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
        "consumer": "unavailable",
        "producer": "create",
        "variable": "itemId"
      },
      {
        "consumer": "later",
        "producer": "create",
        "variable": "itemId"
      }
    ],
    "id": "2b10c577-d25b-4e91-b9da-7294201854e6",
    "predicateRef": {
      "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
      "id": "a4e49b34-0b7e-4d33-90a8-a9b79218da06",
      "version": 1
    },
    "rationale": "Journey validating item state transition restrictions from unavailable to allocated.",
    "steps": [
      {
        "bodyBindings": [],
        "expectedStatuses": [
          201
        ],
        "extracts": [
          {
            "expectedType": "string",
            "name": "itemId",
            "sensitive": false,
            "source": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "create"
            }
          }
        ],
        "id": "create",
        "operationId": "POST /api/items",
        "parameters": []
      },
      {
        "bodyBindings": [],
        "expectedStatuses": [
          200,
          409
        ],
        "extracts": [],
        "id": "unavailable",
        "operationId": "POST /api/items/{itemId}/unavailable",
        "parameters": [
          {
            "location": "path",
            "name": "itemId",
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
        "operationId": "POST /api/items/{itemId}/allocate",
        "parameters": [
          {
            "location": "path",
            "name": "itemId",
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
          "stepId": "unavailable"
        },
        "op": "equals",
        "right": {
          "kind": "literal",
          "value": "UNAVAILABLE"
        }
      },
      {
        "left": {
          "kind": "json",
          "pointer": "/id",
          "stepId": "unavailable"
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
          "stepId": "unavailable"
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
          "value": "ALLOCATED"
        }
      }
    ],
    "canonicalHash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
    "id": "a4e49b34-0b7e-4d33-90a8-a9b79218da06",
    "source": "DEVELOPER",
    "sourceRef": "an item observed as UNAVAILABLE must not later be observed as ALLOCATED within the same fresh trial",
    "version": 1
  },
  "predicateRef": {
    "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
    "id": "a4e49b34-0b7e-4d33-90a8-a9b79218da06",
    "version": 1
  },
  "replays": [
    {
      "baseline": {
        "assertionIds": [
          "34085eb9-c2e7-4fc3-8205-0af935ceee16"
        ],
        "checkStepIds": [
          "baseline"
        ],
        "id": "11a0a870-e285-4da9-a8e3-d59035a4ac98",
        "resetStepIds": [
          "reset"
        ],
        "runId": "6ceb8ec7-2eed-4e2c-b24f-6adc66a245d4",
        "trialId": "0ac7c082-b926-44c8-b007-19ecc22fc9d8",
        "verdict": "SATISFIED"
      },
      "evidence": {
        "baselineEvidenceId": "11a0a870-e285-4da9-a8e3-d59035a4ac98",
        "id": "fb57583b-5a73-4973-922b-c4f5d38e0a34",
        "observationIds": [
          "72483680-f742-4833-99d8-8b868007e1b4",
          "de153570-dcec-4908-9546-d40b9240df63",
          "ec3cb849-b25b-4eeb-b8e9-a52d86407cf4"
        ],
        "outcome": "VIOLATED",
        "phase": "REPLAY",
        "predicateRef": {
          "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
          "id": "a4e49b34-0b7e-4d33-90a8-a9b79218da06",
          "version": 1
        },
        "runId": "6ceb8ec7-2eed-4e2c-b24f-6adc66a245d4",
        "symbolicOperands": {
          "applicability": [
            {
              "left": {
                "kind": "json",
                "pointer": "/state",
                "stepId": "unavailable"
              },
              "op": "equals",
              "right": {
                "kind": "literal",
                "value": "UNAVAILABLE"
              }
            },
            {
              "left": {
                "kind": "json",
                "pointer": "/id",
                "stepId": "unavailable"
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
                "stepId": "unavailable"
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
                "value": "ALLOCATED"
              }
            }
          ],
          "executionOrder": [
            {
              "operationId": "POST /api/items",
              "ordinal": 0,
              "stepId": "create"
            },
            {
              "operationId": "POST /api/items/{itemId}/unavailable",
              "ordinal": 1,
              "stepId": "unavailable"
            },
            {
              "operationId": "POST /api/items/{itemId}/allocate",
              "ordinal": 2,
              "stepId": "later"
            }
          ]
        },
        "trialId": "0ac7c082-b926-44c8-b007-19ecc22fc9d8"
      },
      "observations": [
        {
          "id": "ec3cb849-b25b-4eeb-b8e9-a52d86407cf4",
          "result": {
            "elapsedMs": 2.6256670000002487,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/items",
              "url": "http://127.0.0.1:52965/api/items"
            },
            "sanitizedResponse": {
              "body": {
                "id": "544235b2-1b22-4a6e-a5a4-b99d1a1a4769",
                "state": "AVAILABLE"
              },
              "elapsedMs": 2.6256670000002487,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 22:06:19 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 201,
              "text": "{\"id\":\"544235b2-1b22-4a6e-a5a4-b99d1a1a4769\",\"state\":\"AVAILABLE\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T22:06:19.325Z",
            "status": 201,
            "stepId": "create",
            "truncated": false
          },
          "runId": "6ceb8ec7-2eed-4e2c-b24f-6adc66a245d4",
          "stateMappings": [],
          "stepId": "create",
          "trialId": "0ac7c082-b926-44c8-b007-19ecc22fc9d8"
        },
        {
          "id": "72483680-f742-4833-99d8-8b868007e1b4",
          "result": {
            "elapsedMs": 1.8708750000077998,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/items/{itemId}/unavailable",
              "url": "http://127.0.0.1:52965/api/items/544235b2-1b22-4a6e-a5a4-b99d1a1a4769/unavailable"
            },
            "sanitizedResponse": {
              "body": {
                "id": "544235b2-1b22-4a6e-a5a4-b99d1a1a4769",
                "state": "UNAVAILABLE"
              },
              "elapsedMs": 1.8708750000077998,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 22:06:19 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"544235b2-1b22-4a6e-a5a4-b99d1a1a4769\",\"state\":\"UNAVAILABLE\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T22:06:19.331Z",
            "status": 200,
            "stepId": "unavailable",
            "truncated": false
          },
          "runId": "6ceb8ec7-2eed-4e2c-b24f-6adc66a245d4",
          "stateMappings": [],
          "stepId": "unavailable",
          "trialId": "0ac7c082-b926-44c8-b007-19ecc22fc9d8"
        },
        {
          "id": "de153570-dcec-4908-9546-d40b9240df63",
          "result": {
            "elapsedMs": 1.6831250000104774,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/items/{itemId}/allocate",
              "url": "http://127.0.0.1:52965/api/items/544235b2-1b22-4a6e-a5a4-b99d1a1a4769/allocate"
            },
            "sanitizedResponse": {
              "body": {
                "id": "544235b2-1b22-4a6e-a5a4-b99d1a1a4769",
                "state": "ALLOCATED"
              },
              "elapsedMs": 1.6831250000104774,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 22:06:19 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"544235b2-1b22-4a6e-a5a4-b99d1a1a4769\",\"state\":\"ALLOCATED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T22:06:19.337Z",
            "status": 200,
            "stepId": "later",
            "truncated": false
          },
          "runId": "6ceb8ec7-2eed-4e2c-b24f-6adc66a245d4",
          "stateMappings": [],
          "stepId": "later",
          "trialId": "0ac7c082-b926-44c8-b007-19ecc22fc9d8"
        }
      ]
    }
  ],
  "reproductionClaim": "shortest verified sequence found",
  "runId": "6ceb8ec7-2eed-4e2c-b24f-6adc66a245d4",
  "setup": "Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.",
  "stopReason": "LOCAL MINIMUM",
  "truncated": false,
  "verification": "UNVERIFIED"
}
```
