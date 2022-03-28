import { gql, ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";

class UserInfo {
  constructor() {
    this.client = new ApolloClient({
      link: new HttpLink({
        uri: process.env.REACT_APP_PUBLIC_SUBGRAPH,
      }),
      cache: new InMemoryCache(),
    });
  }

  async getHistory(account) {
    return await this.client.query({
      query: gql`
                {
                    userHistories(where : {
                        user : "${account}"
                    }) {
                        id
                        type
                        user
                        amount
                        timestamp
                    }
                }
            `,
    });
  }
}

export const user = new UserInfo();
