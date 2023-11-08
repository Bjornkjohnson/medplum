import ExampleCode from '!!raw-loader!@site/../examples/src/auth/token-exchange.ts';
import MedplumCodeBlock from '@site/src/components/MedplumCodeBlock';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Token Exchange

## Overview

Medplum supports the [OAuth 2.0 Token Exchange](https://datatracker.ietf.org/doc/html/rfc8693) proposed standard. Token exchange provides a mechanism exchange an external access token for a Medplum access token without redirecting the user. This is useful when your application has already authenticated the user with an external identity provider, such as [Auth0](https://auth0.com/), and would access the medplum api services without requiring the user to log in again.

## Set up your ClientApplication

In order to authenticate the user, Medplum's authentication server will call the `/userinfo` endpoint of the external identity provider and check for a valid response. Therefore, it is important that the corresponding [`ClientApplication`](https://app.medplum.com/ClientApplication) in your Medplum project has an identity provider set up with a user info URL specified.

To set up an identity provider for your [`ClientApplication`](https://app.medplum.com/ClientApplication):

1. Log in to your Medplum project.
1. Navigate to the [ClientApplications page](https://app.medplum.com/ClientApplication).
1. Click on the [`ClientApplication`](https://app.medplum.com/ClientApplication) that you would like to set up with an identity provider.
1. Click the "Edit" tab.
1. Scroll down to the "Identity Provider" section.
1. Enter the `/userinfo` URL for your external identity provider in the "User Info URL" textbox.
1. Click "Save" to save your changes.

:::caution Scopes

By default, Medplum will use the user's email address to identify their Medplum user, so you must make sure that you have requested your external access token with the `email` scope.

If you would like to use the `sub` (subject) identifier assigned by the external authentication provider, you must check "Use Subject" in your "Identity Provider" settings.

:::

## Exchanging tokens

Once you have set up the identity provider for your [`ClientApplication`](https://app.medplum.com/ClientApplication), you can use the `/oauth2/token` endpoint to exchange the external access token for a Medplum access token.

The client makes a token exchange request to the token endpoint with an extension grant type using the HTTP POST method. The following parameters are included in the HTTP request entity-body using the application/x-www-form-urlencoded format with a character encoding of UTF-8.

- **grant_type**: The constant value of "urn:ietf:params:oauth:grant-type:token-exchange".
- **client_id**: The ID of the [`ClientApplication`](https://app.medplum.com/ClientApplication) in your Medplum project that will be making the exchange request.
- **subject_token**: The access token that was generated by the external identity provider.
- **subject_token_type**: The subject token type as defined in Section 3. Only "urn:ietf:params:oauth:token-type:access_token" is currently supported.

:::tip Example

<Tabs groupId="language">
  <TabItem value="ts" label="TypeScript">
    <MedplumCodeBlock language="ts" selectBlocks="tokenExchange">
      {ExampleCode}
    </MedplumCodeBlock>
  </TabItem>
  <TabItem value="curl" label="cURL">
    <MedplumCodeBlock language="bash" selectBlocks="tokenExchangeCurl">
      {ExampleCode}
    </MedplumCodeBlock>
  </TabItem>
</Tabs>

:::

The response will include a Medplum access token, which you can use to access the Medplum API. The Medplum SDK also provides the [`exchangeExternalAccessToken()`](/docs/sdk/core.medplumclient.exchangeexternalaccesstoken) helper method.

## Legacy `/auth/exchange` endpoint

Before supporting the OAuth 2.0 Token Exchange standard, Medplum provided the `/auth/exchange` endpoint. This endpoint is deprecated, and developers are encouraged to adopt the standard.