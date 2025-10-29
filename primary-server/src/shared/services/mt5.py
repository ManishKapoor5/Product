# mt5_bridge.py

import MetaTrader5 as mt5
from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime, timedelta
import pandas as pd

app = Flask(__name__)
CORS(app)

# Store active connections (in production, use Redis)
connections = {}

@app.route('/health', methods=['GET'])
def health():
    """Health check"""
    return jsonify({'status': 'ok', 'mt5_initialized': mt5.initialize()})

@app.route('/connect', methods=['POST'])
def connect():
    """Connect to MT5 account"""
    try:
        data = request.json
        login = int(data['login'])
        password = data['password']
        server = data['server']
        
        # Initialize MT5
        if not mt5.initialize():
            return jsonify({
                'success': False,
                'error': f'MT5 initialization failed: {mt5.last_error()}'
            }), 400
        
        # Login
        authorized = mt5.login(login, password=password, server=server)
        
        if not authorized:
            error = mt5.last_error()
            return jsonify({
                'success': False,
                'error': f'Login failed: {error}'
            }), 401
        
        # Get account info
        account_info = mt5.account_info()
        
        if account_info is None:
            return jsonify({
                'success': False,
                'error': 'Failed to get account info'
            }), 400
        
        return jsonify({
            'success': True,
            'data': {
                'login': account_info.login,
                'server': account_info.server,
                'balance': account_info.balance,
                'equity': account_info.equity,
                'currency': account_info.currency,
                'leverage': account_info.leverage,
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/disconnect', methods=['POST'])
def disconnect():
    """Disconnect from MT5"""
    mt5.shutdown()
    return jsonify({'success': True})

@app.route('/trades', methods=['POST'])
def get_trades():
    """Fetch historical trades"""
    try:
        data = request.json
        
        # Connect first
        login = int(data['credentials']['login'])
        password = data['credentials']['password']
        server = data['credentials']['server']
        
        if not mt5.initialize():
            return jsonify({
                'success': False,
                'error': f'MT5 initialization failed: {mt5.last_error()}'
            }), 400
        
        authorized = mt5.login(login, password=password, server=server)
        if not authorized:
            return jsonify({
                'success': False,
                'error': f'Login failed: {mt5.last_error()}'
            }), 401
        
        # Parse dates
        from_date = datetime.fromisoformat(data.get('fromDate', '2020-01-01'))
        to_date = datetime.fromisoformat(data.get('toDate', datetime.now().isoformat()))
        
        # Get deals (closed positions)
        deals = mt5.history_deals_get(from_date, to_date)
        
        if deals is None:
            return jsonify({
                'success': False,
                'error': f'Failed to get deals: {mt5.last_error()}'
            }), 400
        
        # Group deals by position ID
        positions = {}
        for deal in deals:
            # Skip balance operations
            if deal.type not in [mt5.DEAL_TYPE_BUY, mt5.DEAL_TYPE_SELL]:
                continue
            
            position_id = deal.position_id
            if position_id == 0:
                continue
            
            if position_id not in positions:
                positions[position_id] = []
            
            positions[position_id].append(deal)
        
        # Convert to trades
        trades = []
        for position_id, position_deals in positions.items():
            # Sort by time
            position_deals.sort(key=lambda x: x.time)
            
            # Check if position is closed
            has_entry = any(d.entry == mt5.DEAL_ENTRY_IN for d in position_deals)
            has_exit = any(d.entry == mt5.DEAL_ENTRY_OUT for d in position_deals)
            
            if not (has_entry and has_exit):
                continue  # Skip open positions
            
            open_deal = position_deals[0]
            close_deal = position_deals[-1]
            
            # Calculate totals
            total_profit = sum(d.profit for d in position_deals)
            total_commission = sum(d.commission for d in position_deals)
            total_swap = sum(d.swap for d in position_deals)
            
            trades.append({
                'externalTradeId': str(position_id),
                'symbol': open_deal.symbol,
                'tradeType': 'BUY' if open_deal.type == mt5.DEAL_TYPE_BUY else 'SELL',
                'openTime': datetime.fromtimestamp(open_deal.time).isoformat(),
                'closeTime': datetime.fromtimestamp(close_deal.time).isoformat(),
                'quantity': open_deal.volume,
                'openPrice': open_deal.price,
                'closePrice': close_deal.price,
                'profit': total_profit,
                'commission': total_commission,
                'swap': total_swap,
                'rawData': {
                    'ticket': str(position_id),
                    'realMT5Data': True,
                    'source': 'MT5-Python-Bridge',
                    'dealCount': len(position_deals),
                }
            })
        
        # Shutdown
        mt5.shutdown()
        
        return jsonify({
            'success': True,
            'trades': trades
        })
        
    except Exception as e:
        mt5.shutdown()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/account-info', methods=['POST'])
def get_account_info():
    """Get account information"""
    try:
        data = request.json
        
        login = int(data['login'])
        password = data['password']
        server = data['server']
        
        if not mt5.initialize():
            return jsonify({'success': False, 'error': 'MT5 init failed'}), 400
        
        authorized = mt5.login(login, password=password, server=server)
        if not authorized:
            return jsonify({'success': False, 'error': 'Login failed'}), 401
        
        account_info = mt5.account_info()
        
        result = {
            'success': True,
            'data': {
                'login': account_info.login,
                'server': account_info.server,
                'balance': account_info.balance,
                'equity': account_info.equity,
                'margin': account_info.margin,
                'freeMargin': account_info.margin_free,
                'currency': account_info.currency,
                'leverage': account_info.leverage,
                'profit': account_info.profit,
            }
        }
        
        mt5.shutdown()
        return jsonify(result)
        
    except Exception as e:
        mt5.shutdown()
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    print('🚀 MT5 Bridge Service starting...')
    print('📍 Running on http://localhost:5000')
    app.run(host='0.0.0.0', port=5000, debug=True)