<Heading
  as={"h1"}
  className={"openapi__heading"}
  children={"sdk_v1_flags"}
>

<MethodEndpoint
  method={"get"}
  path={"/api/v1/flags/"}
  context={"endpoint"}
>
  

Retrieve the feature flags for an environment.

---
*Note*: when providing the `feature` query argument, this endpoint will
return either a single object or a 404 (if the feature does not exist) rather
than a list.

---
*Note*: using this endpoint with an identifier is deprecated.
Please use `/api/v1/identities/?identifier=` instead.

<Heading
  id={"request"}
  as={"h2"}
  className={"openapi-tabs__heading"}
  children={"Request"}
>

<ParamsDetails
  parameters={[{"name":"feature","in":"query","description":"Name of the feature to get the state of","schema":{"type":"string","minLength":1}}]}
>
  

<RequestSchema
  title={"Body"}
  body={undefined}
>
  

<StatusCodes
  id={undefined}
  label={undefined}
  responses={{"200":{"description":"","content":{"application/json":{"schema":{"type":"array","items":{"type":"object","description":"Represents a single flag (feature state) returned by the Flagsmith SDK.","properties":{"feature":{"description":"Represents a Flagsmith feature, defined at project level.","type":"object","properties":{"id":{"type":"integer"},"name":{"type":"string"},"type":{"type":"string","enum":["STANDARD","MULTIVARIATE"]}},"required":["id","name","type"]},"enabled":{"type":"boolean"},"feature_state_value":{"nullable":true,"oneOf":[{"type":"integer"},{"type":"boolean"},{"type":"string"}]},"variant":{"type":"string","nullable":true},"reason":{"type":"string","nullable":true}},"required":["enabled","feature","feature_state_value"]}}}}}}}
>
