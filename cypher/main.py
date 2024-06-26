import os
import joblib as jb
from dotenv import load_dotenv, find_dotenv
from onchain.addresses import USDT
from giza_logic.model import get_user_inputs, prediction_df, test
from giza_logic.agent_helpers import create_agent, predict, get_pred_val
from datetime import datetime, timedelta
from twelveData import data
from onchain import fetch, helpers, options

load_dotenv(find_dotenv())
network_url = os.environ.get("PUBLIC_RPC")

transformer = jb.load('giza_logic/transformer.pkl')
scaler = jb.load('giza_logic/scaler.pkl')

def days_forward(days_from_now):
    future_time = datetime.now() + timedelta(days=days_from_now)
    return future_time

def buy_option_agent(agent_id: int, amt: float, duration: int, account="doptions", chain=network_url):
    print("fetching data")
    fetched_df = data.predict_btc()
    processed_df = prediction_df(fetched_df, scaler, transformer)
    contracts = {
        "usdt": USDT
    }
    agent = create_agent(agent_id, chain, contracts, account)
    result = predict(agent, processed_df)
    outcome = get_pred_val(result)
    print(outcome)
    if outcome == 1:
        with agent.execute() as contracts:
            print("Buying CALL")
            option = fetch.get_call_option(amt, days_forward(duration))
            if option:
                helpers.approve_tokens(USDT, option[0], option[1])
                options.buy_option("CALL", option[0])
                return "Successfully Bought"
            else:
                print("no option available")
                return "watch"

    elif outcome == 0:
        with agent.execute() as contracts:
            print("Buying PUT")
            option = fetch.get_put_option(amt, days_forward(duration))
            if option:
                helpers.approve_tokens(USDT, option[0], option[1])
                options.buy_option("PUT", option[0])
                print("Successfully Bought")
            else:
                print("no option available")
                return "watch"
    else:
        print("watch!")
        return 'watch'

if __name__ == "__main__":
    # test()
    print("getting user inputs")
    id_agent, amount_to_invest, risk_profile, duration_of_investment = get_user_inputs()
    amount_to_invest = amount_to_invest * 10**18
    print("checking volatility")
    avg_volatility = data.avg_volatility()
    if risk_profile == 'low':
        if avg_volatility > 0.05:
            print("volatile market as per your risk profile")
        else:
            buy_option_agent(id_agent, amt=amount_to_invest, duration=duration_of_investment)
    elif risk_profile == 'medium':
        if avg_volatility > 0.2:
            print("volatile market as per your risk profile")
        else:
            buy_option_agent(id_agent, amt=amount_to_invest, duration=duration_of_investment)
    elif risk_profile == 'high':
        buy_option_agent(id_agent, amt=amount_to_invest, duration=duration_of_investment)
    else:
        print("invalid input, try again")