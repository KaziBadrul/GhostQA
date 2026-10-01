# GhostQA finding evidence

Finding: `fedd99f6-08cb-4ff3-a261-dccbdb78d7bf` — CONFIRMED
Evidence chain: OBSERVED VIOLATION → CONFIRMED → best verified reproducer.
Consistency: true. Artifact: GENERATED / UNVERIFIED.

Predicate: `51def06d-510d-4b21-8011-d445e722be06`, version 1, canonical hash `04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9`.
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

- EXPLORATION: evidence `84156a40-5321-4c72-9115-f27949658417`, trial `587ef1ab-efba-468a-b39b-ef3e46dfbf2c`, baseline `a13eff72-034c-4888-b81e-5f050a140724`, verdict VIOLATED.
- REPLAY: evidence `69f35b7c-83bf-4790-a265-81fa90e64ec4`, trial `b2433e4d-0ef9-4021-aa74-6ee6f7af91ac`, baseline `b060863f-8629-4810-b0a8-c142bfedb7c1`, verdict VIOLATED.

## Minimized reproduction

1. `create` — `POST /api/items`
2. `unavailable` — `POST /api/items/{itemId}/unavailable`
3. `later` — `POST /api/items/{itemId}/allocate`

## Minimized attempt history

- Remove `create`: rejected; PRODUCER REQUIRED; candidate `30b17ce3-e8f7-42ed-889c-ac689c21b573`.
- Remove `unavailable`: rejected; PREDICATE STEP REQUIRED; candidate `f4d9afa7-e6cf-44b3-92d7-cd8e219a4d01`.
- Remove `later`: rejected; PREDICATE STEP REQUIRED; candidate `b9d7cb31-1976-498c-9f19-9ccd3a8448da`.

## Setup and verification

Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.
Generation does not establish supervised verification. This manifest has not been verified through the originating run.

## Exact assertions and sanitized evidence

```json
{
  "approval": {
    "asOf": "2026-10-01T21:08:51.385Z",
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
    "id": "79bc8a1d-cc56-4523-a6b2-56cb37a50b8b",
    "predicateRef": {
      "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
      "id": "51def06d-510d-4b21-8011-d445e722be06",
      "version": 1
    },
    "rationale": "Journey validating that an item marked unavailable cannot subsequently be allocated.",
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
          200
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
    "acceptedAt": "2026-10-01T21:08:51.385Z",
    "deadlineAt": "2026-10-01T21:18:51.385Z",
    "runId": "3dc7811a-d46d-4e97-8bdd-47875f59e316",
    "trialIds": [
      "587ef1ab-efba-468a-b39b-ef3e46dfbf2c",
      "b2433e4d-0ef9-4021-aa74-6ee6f7af91ac"
    ]
  },
  "finding": {
    "classification": "CONFIRMED",
    "consistent": true,
    "id": "fedd99f6-08cb-4ff3-a261-dccbdb78d7bf",
    "initialEvidenceId": "84156a40-5321-4c72-9115-f27949658417",
    "minimizationStop": "LOCAL MINIMUM",
    "minimizedJourneyId": "79bc8a1d-cc56-4523-a6b2-56cb37a50b8b",
    "originalJourneyId": "79bc8a1d-cc56-4523-a6b2-56cb37a50b8b",
    "predicateRef": {
      "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
      "id": "51def06d-510d-4b21-8011-d445e722be06",
      "version": 1
    },
    "projectId": "bb36dad3-4ee5-4c6b-9d1f-cd07c37cd187",
    "replayEvidenceIds": [
      "69f35b7c-83bf-4790-a265-81fa90e64ec4"
    ],
    "transitions": [
      {
        "evidenceRefs": [
          "84156a40-5321-4c72-9115-f27949658417"
        ],
        "next": "OBSERVED VIOLATION",
        "prior": null,
        "reason": "INITIAL PREDICATE VIOLATION"
      },
      {
        "evidenceRefs": [
          "84156a40-5321-4c72-9115-f27949658417",
          "69f35b7c-83bf-4790-a265-81fa90e64ec4"
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
        "c21ea03d-a988-4863-ba8b-a314f3b62274"
      ],
      "checkStepIds": [
        "baseline"
      ],
      "id": "a13eff72-034c-4888-b81e-5f050a140724",
      "resetStepIds": [
        "reset"
      ],
      "runId": "3dc7811a-d46d-4e97-8bdd-47875f59e316",
      "trialId": "587ef1ab-efba-468a-b39b-ef3e46dfbf2c",
      "verdict": "SATISFIED"
    },
    "evidence": {
      "baselineEvidenceId": "a13eff72-034c-4888-b81e-5f050a140724",
      "id": "84156a40-5321-4c72-9115-f27949658417",
      "observationIds": [
        "ab82f9c4-d641-429e-9bae-f9427be824ca",
        "23ebe413-ff3e-43a7-b27d-6d503869f71b",
        "f7c4cd89-2828-4ee7-b108-cc74024c3dfe"
      ],
      "outcome": "VIOLATED",
      "phase": "EXPLORATION",
      "predicateRef": {
        "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
        "id": "51def06d-510d-4b21-8011-d445e722be06",
        "version": 1
      },
      "runId": "3dc7811a-d46d-4e97-8bdd-47875f59e316",
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
      "trialId": "587ef1ab-efba-468a-b39b-ef3e46dfbf2c"
    },
    "observations": [
      {
        "id": "f7c4cd89-2828-4ee7-b108-cc74024c3dfe",
        "result": {
          "elapsedMs": 1.5507089999955497,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/items",
            "url": "http://127.0.0.1:57873/api/items"
          },
          "sanitizedResponse": {
            "body": {
              "id": "24831456-c494-415e-a21d-679dfad4ea39",
              "state": "AVAILABLE"
            },
            "elapsedMs": 1.5507089999955497,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 21:08:54 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 201,
            "text": "{\"id\":\"24831456-c494-415e-a21d-679dfad4ea39\",\"state\":\"AVAILABLE\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T21:08:54.524Z",
          "status": 201,
          "stepId": "create",
          "truncated": false
        },
        "runId": "3dc7811a-d46d-4e97-8bdd-47875f59e316",
        "stateMappings": [],
        "stepId": "create",
        "trialId": "587ef1ab-efba-468a-b39b-ef3e46dfbf2c"
      },
      {
        "id": "ab82f9c4-d641-429e-9bae-f9427be824ca",
        "result": {
          "elapsedMs": 1.7681660000016564,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/items/{itemId}/unavailable",
            "url": "http://127.0.0.1:57873/api/items/24831456-c494-415e-a21d-679dfad4ea39/unavailable"
          },
          "sanitizedResponse": {
            "body": {
              "id": "24831456-c494-415e-a21d-679dfad4ea39",
              "state": "UNAVAILABLE"
            },
            "elapsedMs": 1.7681660000016564,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 21:08:54 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"24831456-c494-415e-a21d-679dfad4ea39\",\"state\":\"UNAVAILABLE\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T21:08:54.532Z",
          "status": 200,
          "stepId": "unavailable",
          "truncated": false
        },
        "runId": "3dc7811a-d46d-4e97-8bdd-47875f59e316",
        "stateMappings": [],
        "stepId": "unavailable",
        "trialId": "587ef1ab-efba-468a-b39b-ef3e46dfbf2c"
      },
      {
        "id": "23ebe413-ff3e-43a7-b27d-6d503869f71b",
        "result": {
          "elapsedMs": 1.4098749999975553,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/items/{itemId}/allocate",
            "url": "http://127.0.0.1:57873/api/items/24831456-c494-415e-a21d-679dfad4ea39/allocate"
          },
          "sanitizedResponse": {
            "body": {
              "id": "24831456-c494-415e-a21d-679dfad4ea39",
              "state": "ALLOCATED"
            },
            "elapsedMs": 1.4098749999975553,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 21:08:54 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"24831456-c494-415e-a21d-679dfad4ea39\",\"state\":\"ALLOCATED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T21:08:54.537Z",
          "status": 200,
          "stepId": "later",
          "truncated": false
        },
        "runId": "3dc7811a-d46d-4e97-8bdd-47875f59e316",
        "stateMappings": [],
        "stepId": "later",
        "trialId": "587ef1ab-efba-468a-b39b-ef3e46dfbf2c"
      }
    ]
  },
  "minimization": {
    "attempts": [
      {
        "accepted": false,
        "candidate": {
          "dependencies": [],
          "id": "30b17ce3-e8f7-42ed-889c-ac689c21b573",
          "predicateRef": {
            "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
            "id": "51def06d-510d-4b21-8011-d445e722be06",
            "version": 1
          },
          "rationale": "Journey validating that an item marked unavailable cannot subsequently be allocated.",
          "steps": [
            {
              "bodyBindings": [],
              "expectedStatuses": [
                200
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
          "id": "f4d9afa7-e6cf-44b3-92d7-cd8e219a4d01",
          "predicateRef": {
            "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
            "id": "51def06d-510d-4b21-8011-d445e722be06",
            "version": 1
          },
          "rationale": "Journey validating that an item marked unavailable cannot subsequently be allocated.",
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
          "id": "b9d7cb31-1976-498c-9f19-9ccd3a8448da",
          "predicateRef": {
            "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
            "id": "51def06d-510d-4b21-8011-d445e722be06",
            "version": 1
          },
          "rationale": "Journey validating that an item marked unavailable cannot subsequently be allocated.",
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
                200
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
      "id": "79bc8a1d-cc56-4523-a6b2-56cb37a50b8b",
      "predicateRef": {
        "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
        "id": "51def06d-510d-4b21-8011-d445e722be06",
        "version": 1
      },
      "rationale": "Journey validating that an item marked unavailable cannot subsequently be allocated.",
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
            200
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
      "id": "fedd99f6-08cb-4ff3-a261-dccbdb78d7bf",
      "initialEvidenceId": "84156a40-5321-4c72-9115-f27949658417",
      "minimizationStop": "LOCAL MINIMUM",
      "minimizedJourneyId": "79bc8a1d-cc56-4523-a6b2-56cb37a50b8b",
      "originalJourneyId": "79bc8a1d-cc56-4523-a6b2-56cb37a50b8b",
      "predicateRef": {
        "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
        "id": "51def06d-510d-4b21-8011-d445e722be06",
        "version": 1
      },
      "projectId": "bb36dad3-4ee5-4c6b-9d1f-cd07c37cd187",
      "replayEvidenceIds": [
        "69f35b7c-83bf-4790-a265-81fa90e64ec4"
      ],
      "transitions": [
        {
          "evidenceRefs": [
            "84156a40-5321-4c72-9115-f27949658417"
          ],
          "next": "OBSERVED VIOLATION",
          "prior": null,
          "reason": "INITIAL PREDICATE VIOLATION"
        },
        {
          "evidenceRefs": [
            "84156a40-5321-4c72-9115-f27949658417",
            "69f35b7c-83bf-4790-a265-81fa90e64ec4"
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
    "id": "79bc8a1d-cc56-4523-a6b2-56cb37a50b8b",
    "predicateRef": {
      "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
      "id": "51def06d-510d-4b21-8011-d445e722be06",
      "version": 1
    },
    "rationale": "Journey validating that an item marked unavailable cannot subsequently be allocated.",
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
          200
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
    "id": "51def06d-510d-4b21-8011-d445e722be06",
    "source": "DEVELOPER",
    "sourceRef": "an item observed as UNAVAILABLE must not later be observed as ALLOCATED within the same fresh trial",
    "version": 1
  },
  "predicateRef": {
    "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
    "id": "51def06d-510d-4b21-8011-d445e722be06",
    "version": 1
  },
  "replays": [
    {
      "baseline": {
        "assertionIds": [
          "c21ea03d-a988-4863-ba8b-a314f3b62274"
        ],
        "checkStepIds": [
          "baseline"
        ],
        "id": "b060863f-8629-4810-b0a8-c142bfedb7c1",
        "resetStepIds": [
          "reset"
        ],
        "runId": "3dc7811a-d46d-4e97-8bdd-47875f59e316",
        "trialId": "b2433e4d-0ef9-4021-aa74-6ee6f7af91ac",
        "verdict": "SATISFIED"
      },
      "evidence": {
        "baselineEvidenceId": "b060863f-8629-4810-b0a8-c142bfedb7c1",
        "id": "69f35b7c-83bf-4790-a265-81fa90e64ec4",
        "observationIds": [
          "79106921-da4a-4d52-886f-0e608f699f99",
          "b052df10-7243-4f53-adf7-2832a35b74c9",
          "886bafed-27be-42f2-94fe-d8f1350e32c8"
        ],
        "outcome": "VIOLATED",
        "phase": "REPLAY",
        "predicateRef": {
          "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
          "id": "51def06d-510d-4b21-8011-d445e722be06",
          "version": 1
        },
        "runId": "3dc7811a-d46d-4e97-8bdd-47875f59e316",
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
        "trialId": "b2433e4d-0ef9-4021-aa74-6ee6f7af91ac"
      },
      "observations": [
        {
          "id": "79106921-da4a-4d52-886f-0e608f699f99",
          "result": {
            "elapsedMs": 1.3171670000010636,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/items",
              "url": "http://127.0.0.1:57873/api/items"
            },
            "sanitizedResponse": {
              "body": {
                "id": "3d17184d-b5e9-4ef3-b15e-d5e16f393825",
                "state": "AVAILABLE"
              },
              "elapsedMs": 1.3171670000010636,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 21:08:54 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 201,
              "text": "{\"id\":\"3d17184d-b5e9-4ef3-b15e-d5e16f393825\",\"state\":\"AVAILABLE\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T21:08:54.571Z",
            "status": 201,
            "stepId": "create",
            "truncated": false
          },
          "runId": "3dc7811a-d46d-4e97-8bdd-47875f59e316",
          "stateMappings": [],
          "stepId": "create",
          "trialId": "b2433e4d-0ef9-4021-aa74-6ee6f7af91ac"
        },
        {
          "id": "b052df10-7243-4f53-adf7-2832a35b74c9",
          "result": {
            "elapsedMs": 1.2802079999964917,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/items/{itemId}/unavailable",
              "url": "http://127.0.0.1:57873/api/items/3d17184d-b5e9-4ef3-b15e-d5e16f393825/unavailable"
            },
            "sanitizedResponse": {
              "body": {
                "id": "3d17184d-b5e9-4ef3-b15e-d5e16f393825",
                "state": "UNAVAILABLE"
              },
              "elapsedMs": 1.2802079999964917,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 21:08:54 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"3d17184d-b5e9-4ef3-b15e-d5e16f393825\",\"state\":\"UNAVAILABLE\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T21:08:54.574Z",
            "status": 200,
            "stepId": "unavailable",
            "truncated": false
          },
          "runId": "3dc7811a-d46d-4e97-8bdd-47875f59e316",
          "stateMappings": [],
          "stepId": "unavailable",
          "trialId": "b2433e4d-0ef9-4021-aa74-6ee6f7af91ac"
        },
        {
          "id": "886bafed-27be-42f2-94fe-d8f1350e32c8",
          "result": {
            "elapsedMs": 1.1008329999967827,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/items/{itemId}/allocate",
              "url": "http://127.0.0.1:57873/api/items/3d17184d-b5e9-4ef3-b15e-d5e16f393825/allocate"
            },
            "sanitizedResponse": {
              "body": {
                "id": "3d17184d-b5e9-4ef3-b15e-d5e16f393825",
                "state": "ALLOCATED"
              },
              "elapsedMs": 1.1008329999967827,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 21:08:54 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"3d17184d-b5e9-4ef3-b15e-d5e16f393825\",\"state\":\"ALLOCATED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T21:08:54.578Z",
            "status": 200,
            "stepId": "later",
            "truncated": false
          },
          "runId": "3dc7811a-d46d-4e97-8bdd-47875f59e316",
          "stateMappings": [],
          "stepId": "later",
          "trialId": "b2433e4d-0ef9-4021-aa74-6ee6f7af91ac"
        }
      ]
    }
  ],
  "reproductionClaim": "shortest verified sequence found",
  "runId": "3dc7811a-d46d-4e97-8bdd-47875f59e316",
  "setup": "Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.",
  "stopReason": "LOCAL MINIMUM",
  "truncated": false,
  "verification": "UNVERIFIED"
}
```
